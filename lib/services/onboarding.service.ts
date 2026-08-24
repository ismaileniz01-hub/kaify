import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { hasPaidPlan } from "@/lib/auth/post-auth-redirect";
import { mapProfileRow, type ProfileDTO } from "@/lib/types/domain.types";
import type { OnboardingInput } from "@/lib/validations/onboarding.schema";
import { recommendOnboardingNutrition } from "@/lib/nutrition/onboarding-recommendation";

/**
 * Maps a Postgres RPC error (raised via RAISE ... USING ERRCODE) to an ApiError.
 *  - P0001 -> business-rule conflict (409)
 *  - P0002 -> profile not found (404)
 *  - anything else -> masked 500
 */
function mapRpcError(
  context: string,
  error: { code?: string; message: string },
): ApiError {
  if (error.code === "P0001") {
    return new ApiError("CONFLICT", error.message);
  }
  if (error.code === "P0002") {
    return new ApiError("NOT_FOUND", "Profil bulunamadı.");
  }
  logger.error(`[${context}] rpc error`, { error: error.message });
  return new ApiError("INTERNAL_ERROR", "İşlem tamamlanamadı.");
}

/**
 * Completes onboarding for the authenticated user.
 * Transitions onboarding_status PAID -> FORMS_COMPLETED via SECURITY DEFINER RPC.
 */
export async function completeOnboarding(
  input: OnboardingInput,
): Promise<ProfileDTO> {
  const supabase = await createServerSupabaseClient();
  const recommendation = recommendOnboardingNutrition(input, new Date());

  const legacyArgs = {
    p_display_name: input.displayName,
    p_gender: input.gender,
    p_height_cm: input.heightCm,
    p_weight_kg: input.weightKg,
    p_experience_level: input.experienceLevel,
    p_is_natural: input.isNatural,
    p_bio: input.bio,
    p_locale: input.locale,
    p_birth_date: input.birthDate,
    p_primary_goal: input.primaryGoal,
    p_activity_level: input.activityLevel,
    p_training_days_per_week: input.trainingDaysPerWeek,
    p_dietary_preference: input.dietaryPreference,
    p_allergies: input.allergies,
    p_disliked_foods: input.dislikedFoods,
    p_health_conditions: input.healthConditions,
    p_country_code: input.countryCode,
  };
  const persistedTargetArgs = {
    ...legacyArgs,
    p_equipment_access: input.equipmentAccess,
    p_calorie_goal: recommendation.calorieTarget,
    p_workouts_target: recommendation.workoutsTarget,
  };
  let { data, error } = await supabase.rpc("complete_onboarding", {
    ...persistedTargetArgs,
    p_maintenance_calorie_goal: recommendation.maintenanceCalories,
  });

  // Rolling deploy stage one: maintenance migration is not visible yet, but
  // the calorie/equipment persistence migration is.
  if (
    error &&
    (error.code === "PGRST202" ||
      /p_maintenance_calorie_goal|schema cache/i.test(error.message))
  ) {
    logger.warn(
      "[onboarding.service:complete] using pre-maintenance RPC signature",
    );
    const previous = await supabase.rpc(
      "complete_onboarding",
      persistedTargetArgs,
    );
    data = previous.data;
    error = previous.error;
  }

  // Rolling deploy stage two: neither persistence migration is visible yet.
  if (
    error &&
    (error.code === "PGRST202" ||
      /p_equipment_access|p_calorie_goal|p_workouts_target|schema cache/i.test(
        error.message,
      ))
  ) {
    logger.warn(
      "[onboarding.service:complete] using pre-persistence RPC signature",
    );
    const oldest = await supabase.rpc("complete_onboarding", legacyArgs);
    data = oldest.data;
    error = oldest.error;
  }

  if (error) {
    throw mapRpcError("onboarding.service:complete", error);
  }
  if (!data) {
    throw new ApiError("INTERNAL_ERROR", "Onboarding tamamlanamadı.");
  }

  const profile = mapProfileRow(data);

  // Paid users who finish forms after checkout would otherwise stay
  // FORMS_COMPLETED forever (apply_subscription only promotes when already
  // past PAID). Never treat a default/unpaid tier as a real plan.
  if (hasPaidPlan(profile)) {
    return (await tryActivateUser(profile)) ?? profile;
  }

  return profile;
}

/**
 * Activates the authenticated user.
 * Transitions onboarding_status FORMS_COMPLETED -> ACTIVE (idempotent).
 * Wired from first check-in and post-forms (when already subscribed).
 */
export async function activateUser(): Promise<ProfileDTO> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("activate_user", {});

  if (error) {
    throw mapRpcError("onboarding.service:activate", error);
  }
  if (!data) {
    throw new ApiError("INTERNAL_ERROR", "Kullanıcı aktifleştirilemedi.");
  }

  return mapProfileRow(data);
}

/**
 * Best-effort activation — never fails the caller (check-in / onboarding).
 * Returns the activated profile when successful, otherwise `fallback`.
 */
export async function tryActivateUser(
  fallback?: ProfileDTO,
): Promise<ProfileDTO | undefined> {
  try {
    return await activateUser();
  } catch (error) {
    if (error instanceof ApiError && error.code === "CONFLICT") {
      return fallback;
    }
    logger.warn("[onboarding.service:tryActivate] skipped", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return fallback;
  }
}
