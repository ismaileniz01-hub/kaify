import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";

/** Mirrors StreakRoad segment milestones (server-authoritative). */
export const STREAK_MILESTONES = [7, 31, 61, 120] as const;
export const MILESTONE_GEM_REWARD = 10;
export const STATION_GEM_REWARD = 10;
export const SPECIAL_STATION_DAY = 90;
export const SPECIAL_STATION_GEM_REWARD = 30;

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

async function claimOne(
  userId: string,
  claimKey: string,
  amount: number,
  description: string,
): Promise<StreakRewardClaimDTO & { gemBalance: number }> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.rpc("claim_streak_gem_rewards", {
    p_user_id: userId,
    p_claim_key: claimKey,
    p_amount: amount,
    p_description: description,
  });

  if (error) {
    logger.error("[streak-rewards] claim rpc error", {
      userId,
      claimKey,
      error: error.message,
    });
    throw new ApiError("INTERNAL_ERROR", "Streak ödülü uygulanamadı.");
  }

  const row = data as {
    claimed?: boolean;
    duplicate?: boolean;
    amount?: number;
    gem_balance?: number;
  };

  return {
    claimKey,
    amount,
    claimed: row.claimed === true,
    duplicate: row.duplicate === true,
    gemBalance: Number(row.gem_balance ?? 0),
  };
}

/**
 * Awards all eligible streak milestone + station gems for the user's current streak.
 * Idempotent per claim_key via streak_gem_claims + gem_ledger.
 */
export async function syncStreakRewards(
  userId: string,
  currentStreak: number,
): Promise<SyncStreakRewardsResult> {
  if (currentStreak <= 0) {
    return { claims: [], gemBalance: 0, totalAwarded: 0 };
  }

  const claims: StreakRewardClaimDTO[] = [];
  let gemBalance = 0;
  let totalAwarded = 0;

  for (const milestone of STREAK_MILESTONES) {
    if (currentStreak >= milestone) {
      const result = await claimOne(
        userId,
        `milestone:${milestone}`,
        MILESTONE_GEM_REWARD,
        `Streak milestone day ${milestone}`,
      );
      claims.push(result);
      gemBalance = result.gemBalance;
      if (result.claimed) totalAwarded += result.amount;
    }
  }

  for (let day = 1; day <= currentStreak; day++) {
    const amount =
      day === SPECIAL_STATION_DAY ? SPECIAL_STATION_GEM_REWARD : STATION_GEM_REWARD;
    const result = await claimOne(
      userId,
      `station:${day}`,
      amount,
      `Streak station day ${day}`,
    );
    claims.push(result);
    gemBalance = result.gemBalance;
    if (result.claimed) totalAwarded += result.amount;
  }

  return { claims, gemBalance, totalAwarded };
}
