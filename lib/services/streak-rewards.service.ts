import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { invalidateSessionSliceCaches } from "@/lib/cache/invalidate";

export {
  MILESTONE_GEM_REWARD,
  SPECIAL_STATION_DAY,
  SPECIAL_STATION_GEM_REWARD,
  STATION_GEM_REWARD,
  STREAK_MILESTONES,
} from "@/lib/streak-rewards.constants";

export type StreakRewardClaimDTO = {
  claimKey: string;
  amount: number;
  claimed: boolean;
  duplicate: boolean;
};

export type SyncStreakRewardsResult = {
  claims: StreakRewardClaimDTO[];
  gemBalance: number;
  totalAwarded: number;
};

/**
 * Awards all eligible streak milestone + station gems for the user's current streak.
 * Single RPC batch — idempotent per claim_key via streak_gem_claims + gem_ledger.
 */
export async function syncStreakRewards(
  userId: string,
  currentStreak: number,
): Promise<SyncStreakRewardsResult> {
  if (currentStreak <= 0) {
    return { claims: [], gemBalance: 0, totalAwarded: 0 };
  }

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.rpc("claim_pending_streak_rewards", {
    p_user_id: userId,
    p_current_streak: currentStreak,
  });

  if (error) {
    logger.error("[streak-rewards] batch claim rpc error", {
      userId,
      error: error.message,
    });
    throw new ApiError("INTERNAL_ERROR", "Streak ödülü uygulanamadı.");
  }

  const row = data as {
    claims?: Array<{
      claim_key?: string;
      amount?: number;
      claimed?: boolean;
      duplicate?: boolean;
    }>;
    gem_balance?: number;
    total_awarded?: number;
  };

  const claims: StreakRewardClaimDTO[] = (row.claims ?? []).map((c) => ({
    claimKey: String(c.claim_key ?? ""),
    amount: Number(c.amount ?? 0),
    claimed: c.claimed === true,
    duplicate: c.duplicate === true,
  }));

  const result = {
    claims,
    gemBalance: Number(row.gem_balance ?? 0),
    totalAwarded: Number(row.total_awarded ?? 0),
  };

  void invalidateSessionSliceCaches(userId).catch(() => undefined);

  return result;
}
