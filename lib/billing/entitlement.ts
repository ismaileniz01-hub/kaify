import { ApiError } from "@/lib/api/errors";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { SubscriptionTier } from "@/lib/types/database.types";

export type EntitlementSnapshot = {
  tier?: SubscriptionTier | null;
  tierStartedAt?: string | null;
  tierExpiresAt?: string | null;
};

export function entitlementIsActive(
  entitlement: EntitlementSnapshot | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (!entitlement?.tier || !entitlement.tierStartedAt) return false;
  if (!entitlement.tierExpiresAt) return true;
  const expiresAt = Date.parse(entitlement.tierExpiresAt);
  return Number.isFinite(expiresAt) && expiresAt > nowMs;
}

export async function assertActiveEntitlement(userId: string): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("profiles")
    .select("tier, tier_started_at, tier_expires_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;

  if (
    !entitlementIsActive(
      data
        ? {
            tier: data.tier,
            tierStartedAt: data.tier_started_at,
            tierExpiresAt: data.tier_expires_at,
          }
        : null,
    )
  ) {
    throw new ApiError(
      "FORBIDDEN",
      "Bu özellik için aktif bir abonelik gereklidir.",
    );
  }
}
