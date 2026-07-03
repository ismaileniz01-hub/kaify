import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import type {
  ProfileRole,
  OnboardingStatus,
  SubscriptionTier,
} from "@/lib/types/database.types";

/**
 * Admin read services. Access is gated by `requireAdmin()` at the route layer;
 * these use the service-role client (RLS bypassed) to aggregate cross-user data.
 */

export type AdminUserRow = {
  id: string;
  displayName: string;
  role: ProfileRole;
  tier: SubscriptionTier;
  onboardingStatus: OnboardingStatus;
  referralCode: string;
  createdAt: string;
};

export type AdminPage<T> = {
  items: T[];
  limit: number;
  offset: number;
};

export async function listUsers(params: {
  limit: number;
  offset: number;
}): Promise<AdminPage<AdminUserRow>> {
  const admin = createAdminSupabaseClient();

  const { data, error } = await admin
    .from("profiles")
    .select("id, display_name, role, tier, onboarding_status, referral_code, created_at")
    .order("created_at", { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (error) {
    logger.error("[admin.service] listUsers error", { error: error.message });
    throw new ApiError("INTERNAL_ERROR", "Kullanıcılar alınamadı.");
  }

  const items: AdminUserRow[] = (data ?? []).map((row) => ({
    id: row.id,
    displayName: row.display_name || (row as { full_name?: string }).full_name || "",
    role: row.role,
    tier: row.tier ?? (row as { subscription_tier?: SubscriptionTier }).subscription_tier ?? "essential",
    onboardingStatus: row.onboarding_status,
    referralCode: row.referral_code,
    createdAt: row.created_at,
  }));

  return { items, limit: params.limit, offset: params.offset };
}

export type AdminReferralRow = {
  id: string;
  referrerId: string;
  referredId: string;
  code: string;
  discountApplied: boolean;
  createdAt: string;
};

export async function listReferrals(params: {
  limit: number;
  offset: number;
}): Promise<AdminPage<AdminReferralRow>> {
  const admin = createAdminSupabaseClient();

  const { data, error } = await admin
    .from("referrals")
    .select("id, referrer_id, referred_id, code, discount_applied, created_at")
    .order("created_at", { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (error) {
    logger.error("[admin.service] listReferrals error", { error: error.message });
    throw new ApiError("INTERNAL_ERROR", "Referanslar alınamadı.");
  }

  const items: AdminReferralRow[] = (data ?? []).map((row) => ({
    id: row.id,
    referrerId: row.referrer_id,
    referredId: row.referred_id,
    code: row.code,
    discountApplied: row.discount_applied,
    createdAt: row.created_at,
  }));

  return { items, limit: params.limit, offset: params.offset };
}
