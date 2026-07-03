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
};

/**
 * Records a referral for a newly-registered user and triggers the reward.
 *
 * SECURITY: delegates to the service-role-only `process_referral` RPC (admin
 * client). The RPC validates the code, prevents self/duplicate referrals,
 * sets `referred_by_code`, logs a referral_event, and awards an idempotent
 * `referral_bonus` to BOTH parties + flags the %3 discount.
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
  return {
    applied: result.applied,
    duplicate: result.duplicate,
    bonus: result.bonus ?? 0,
    discountApplied: result.discount_applied ?? false,
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
