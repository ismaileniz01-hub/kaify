import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import type { ProcessReferralResult } from "@/lib/types/database.types";

export type TrackReferralResult = {
  applied: boolean;
  duplicate: boolean;
  bonus: number;
  discountApplied: boolean;
  skinReward: string | null;
};

/** Premium aura gifted to both parties on a successful referral. */
export const REFERRAL_SKIN_REWARD_ID = "thunder";

async function grantReferralSkin(userIds: string[]): Promise<void> {
  const admin = createAdminSupabaseClient();
  const rows = [...new Set(userIds.filter(Boolean))].map((userId) => ({
    user_id: userId,
    item_id: REFERRAL_SKIN_REWARD_ID,
  }));
  if (rows.length === 0) return;

  const { error } = await admin.from("user_market_inventory").upsert(rows, {
    onConflict: "user_id,item_id",
    ignoreDuplicates: true,
  });
  if (error) {
    logger.error("[referral.service] thunder skin grant failed", {
      error: error.message,
    });
  }
}

/**
 * Records a referral for a newly-registered user and triggers the reward.
 *
 * SECURITY: delegates to the service-role-only `process_referral` RPC (admin
 * client). The RPC validates the code, prevents self/duplicate referrals,
 * sets `referred_by_code`, logs a referral_event, awards an idempotent
 * `referral_bonus` to BOTH parties (referrer subject to 24h velocity cap),
 * and flags the %3 discount. Thunder skin is also granted here (and in the
 * DB migration when applied) so both parties unlock the aura.
 */
export async function trackReferral(params: {
  referredId: string;
  code: string;
}): Promise<TrackReferralResult> {
  const admin = createAdminSupabaseClient();

  const { data, error } = await admin.rpc("process_referral", {
    p_referred_id: params.referredId,
    p_code: params.code,
  });

  if (error) {
    if (error.code === "P0002") {
      throw new ApiError("NOT_FOUND", "Referans kodu bulunamadı.");
    }
    if (error.code === "P0001") {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz referans işlemi.");
    }
    logger.error("[referral.service] rpc error", { error: error.message });
    throw new ApiError("INTERNAL_ERROR", "Referans işlenemedi.");
  }
  if (!data) {
    throw new ApiError("INTERNAL_ERROR", "Referans işlenemedi.");
  }

  const result = data as ProcessReferralResult;
  if (result.applied) {
    const recipients = [params.referredId];
    // Older RPC builds omit referrer_rewarded — treat missing as rewarded.
    if (result.referrer_rewarded !== false && result.referrer_id) {
      recipients.push(result.referrer_id);
    }
    await grantReferralSkin(recipients);
  }

  return {
    applied: result.applied,
    duplicate: result.duplicate,
    bonus: result.bonus ?? 0,
    discountApplied: result.discount_applied ?? false,
    skinReward: result.applied ? REFERRAL_SKIN_REWARD_ID : null,
  };
}

export type ReferralSummary = {
  referralCode: string;
  referredByCode: string | null;
  referredCount: number;
};

/** Returns the authenticated user's referral code and how many they referred. */
export async function getReferralSummary(
  userId: string,
): Promise<ReferralSummary> {
  const supabase = await createServerSupabaseClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("referral_code, referred_by_code")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile) {
    throw new ApiError("INTERNAL_ERROR", "Referans bilgisi alınamadı.");
  }

  const { count, error: countError } = await supabase
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("referrer_id", userId);

  if (countError) {
    logger.error("[referral.service] count error", { error: countError.message });
    throw new ApiError("INTERNAL_ERROR", "Referans sayısı alınamadı.");
  }

  return {
    referralCode: profile.referral_code,
    referredByCode: profile.referred_by_code,
    referredCount: count ?? 0,
  };
}
