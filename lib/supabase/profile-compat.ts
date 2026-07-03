import type { SubscriptionTier } from "@/lib/types/database.types";

/**
 * Legacy production columns that coexist with the migration schema.
 * Backfill migration fills these; until then reads/writes dual-map.
 */
export type LegacyProfileFields = {
  full_name?: string | null;
  subscription_tier?: SubscriptionTier | null;
  height?: number | null;
  weight?: number | null;
  experience?: string | null;
};

export type ProfileRowLike = LegacyProfileFields & {
  display_name?: string | null;
  avatar_url?: string | null;
  country_code?: string | null;
  tier?: SubscriptionTier | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  experience_level?: string | null;
};

export function resolveDisplayName(row: ProfileRowLike): string {
  return (
    (row.display_name && row.display_name.trim()) ||
    (row.full_name && row.full_name.trim()) ||
    "User"
  );
}

export function resolveTier(row: ProfileRowLike): SubscriptionTier {
  return row.tier ?? row.subscription_tier ?? "essential";
}

export function resolveCountryCode(row: ProfileRowLike): string {
  return row.country_code ?? "TR";
}

export function resolveHeightCm(row: ProfileRowLike): number | null {
  return row.height_cm ?? row.height ?? null;
}

export function resolveWeightKg(row: ProfileRowLike): number | null {
  const v = row.weight_kg ?? row.weight;
  return v != null ? Number(v) : null;
}

export function resolveExperience(row: ProfileRowLike): string | null {
  return row.experience_level ?? row.experience ?? null;
}

/** Dual-write legacy column names when updating profiles on bridged schema. */
export function applyLegacyProfileWrites(
  updates: Record<string, unknown>,
): Record<string, unknown> {
  if (updates.display_name !== undefined) {
    updates.full_name = updates.display_name;
  }
  if (updates.height_cm !== undefined) {
    updates.height = updates.height_cm;
  }
  if (updates.weight_kg !== undefined) {
    updates.weight = updates.weight_kg;
  }
  if (updates.experience_level !== undefined) {
    updates.experience = updates.experience_level;
  }
  if (updates.tier !== undefined) {
    updates.subscription_tier = updates.tier;
  }
  return updates;
}
