import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { mapProfileRow, type ProfileDTO } from "@/lib/types/domain.types";
import type { OnboardingInput } from "@/lib/validations/onboarding.schema";

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

  const { data, error } = await supabase.rpc("complete_onboarding", {
    p_display_name: input.displayName,
    p_gender: input.gender,
    p_height_cm: input.heightCm,
    p_weight_kg: input.weightKg,
    p_experience_level: input.experienceLevel,
    p_is_natural: input.isNatural,
    p_bio: input.bio,
    p_locale: input.locale,
    p_birth_date: input.birthDate,
  });

  if (error) {
    throw mapRpcError("onboarding.service:complete", error);
  }
  if (!data) {
    throw new ApiError("INTERNAL_ERROR", "Onboarding tamamlanamadı.");
  }

  const profile = mapProfileRow(data);

  // Paid users who finish forms after checkout would otherwise stay
  // FORMS_COMPLETED forever (apply_subscription only promotes when already
  // past PAID). Promote immediately when a plan is already on the profile.
  if (profile.tier) {
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
