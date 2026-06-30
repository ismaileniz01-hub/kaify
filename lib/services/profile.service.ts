import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/errors";
import type { Database } from "@/lib/types/database.types";
import { mapProfileRow, type ProfileDTO } from "@/lib/types/domain.types";
import type { ProfileUpdateInput } from "@/lib/validations/profile.schema";

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

/**
 * Updates the authenticated user's own profile with validated, non-sensitive
 * fields. Protected columns are excluded at the schema level and enforced again
 * by the database trigger.
 */
export async function updateOwnProfile(
  userId: string,
  patch: ProfileUpdateInput,
): Promise<ProfileDTO> {
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
  if (patch.locale !== undefined) updates.locale = patch.locale;

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select("*")
    .single();

  if (error || !data) {
    console.error(
      "[profile.service:update] error:",
      error?.message ?? "no row returned",
    );
    throw new ApiError("INTERNAL_ERROR", "Profil güncellenemedi.");
  }

  return mapProfileRow(data);
}
