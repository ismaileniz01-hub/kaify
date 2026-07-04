import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import type { Database } from "@/lib/types/database.types";
import { mapProfileRow, type ProfileDTO } from "@/lib/types/domain.types";
import type { ProfileUpdateInput } from "@/lib/validations/profile.schema";
import { applyLegacyProfileWrites } from "@/lib/supabase/profile-compat";

type ProfileUpdateColumns = Database["public"]["Tables"]["profiles"]["Update"];

/**
 * Fetches the authenticated user's own profile.
 * RLS restricts the row to the caller; the explicit id filter is defense-in-depth.
 */
export async function getOwnProfile(userId: string): Promise<ProfileDTO> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) {
    throw new ApiError("NOT_FOUND", "Profil bulunamadı.");
  }

  return mapProfileRow(data);
}

const TIMEZONE_CHANGE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/**
 * Updates the authenticated user's own profile with validated, non-sensitive
 * fields. Protected columns are excluded at the schema level and enforced again
 * by the database trigger.
 */
export async function updateOwnProfile(
  userId: string,
  patch: ProfileUpdateInput,
): Promise<ProfileDTO> {
  const supabase = await createServerSupabaseClient();

  if (patch.timezone !== undefined) {
    const { data: current, error: readError } = await supabase
      .from("profiles")
      .select("timezone, timezone_updated_at")
      .eq("id", userId)
      .maybeSingle();

    if (readError) {
      logger.error("[profile.service:update] timezone read error", {
        error: readError.message,
      });
      throw new ApiError("INTERNAL_ERROR", "Profil güncellenemedi.");
    }

    const prevTz = current?.timezone ?? "UTC";
    if (patch.timezone !== prevTz) {
      const updatedAt = current?.timezone_updated_at
        ? new Date(current.timezone_updated_at).getTime()
        : 0;
      if (updatedAt > 0 && Date.now() - updatedAt < TIMEZONE_CHANGE_COOLDOWN_MS) {
        throw new ApiError(
          "CONFLICT",
          "Saat dilimi 24 saatte bir kez değiştirilebilir.",
        );
      }
    }
  }

  const updates: ProfileUpdateColumns = {};

  if (patch.displayName !== undefined) updates.display_name = patch.displayName;
  if (patch.avatarUrl !== undefined) updates.avatar_url = patch.avatarUrl;
  if (patch.gender !== undefined) updates.gender = patch.gender;
  if (patch.heightCm !== undefined) updates.height_cm = patch.heightCm;
  if (patch.weightKg !== undefined) updates.weight_kg = patch.weightKg;
  if (patch.experienceLevel !== undefined) {
    updates.experience_level = patch.experienceLevel;
  }
  if (patch.isNatural !== undefined) updates.is_natural = patch.isNatural;
  if (patch.bio !== undefined) updates.bio = patch.bio === "" ? null : patch.bio;
  if (patch.countryCode !== undefined) updates.country_code = patch.countryCode;
  if (patch.cityName !== undefined) updates.city_name = patch.cityName === "" ? null : patch.cityName;
  if (patch.locale !== undefined) updates.locale = patch.locale;
  if (patch.timezone !== undefined) {
    updates.timezone = patch.timezone;
    (updates as Record<string, unknown>).timezone_updated_at =
      new Date().toISOString();
  }

  const payload = applyLegacyProfileWrites(
    updates as Record<string, unknown>,
  ) as ProfileUpdateColumns;

  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userId)
    .select("*")
    .single();

  if (error || !data) {
    logger.error("[profile.service:update] error", {
      error: error?.message ?? "no row returned",
    });
    throw new ApiError("INTERNAL_ERROR", "Profil güncellenemedi.");
  }

  return mapProfileRow(data);
}
