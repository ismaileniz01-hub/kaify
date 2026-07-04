import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { earnGems } from "@/lib/services/gem.service";
import {
  buildLoopingReel,
  rollChestReward,
  type ChestRewardDTO,
  type ChestReelSlot,
} from "@/lib/chest-rewards";

export type { ChestRewardDTO, ChestReelSlot, ChestRarity } from "@/lib/chest-rewards";
export type ChestRewardKind = ChestRewardDTO["kind"];

export type DailyChestStatusDTO = {
  canClaim: boolean;
  nextClaimAt: string | null;
  utcDate: string;
};

export type DailyChestClaimDTO = {
  reward: ChestRewardDTO;
  reel: ChestReelSlot[];
  winningIndex: number;
  gemBalance: number;
  freezieBalance: number;
  alreadyClaimed: boolean;
};

/** Temporary: set env DAILY_CHEST_LIMIT_ENABLED=true to restore one claim per UTC day. */
const DAILY_CHEST_LIMIT_ENABLED =
  process.env.DAILY_CHEST_LIMIT_ENABLED === "true";

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function nextUtcMidnightIso(): string {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.toISOString();
}

type StoredChestClaim = {
  date: string;
  reward: ChestRewardDTO;
  reel: ChestReelSlot[];
  winningIndex: number;
};

function readStoredClaim(raw: unknown): StoredChestClaim | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const chest = obj.dailyChest;
  if (!chest || typeof chest !== "object" || Array.isArray(chest)) return null;
  const c = chest as Record<string, unknown>;
  if (typeof c.date !== "string" || !c.reward || typeof c.reward !== "object") return null;
  const reward = c.reward as ChestRewardDTO;
  if (reward.kind !== "gems" && reward.kind !== "freezie") return null;
  return {
    date: c.date,
    reward,
    reel: Array.isArray(c.reel) ? (c.reel as ChestReelSlot[]) : [],
    winningIndex: typeof c.winningIndex === "number" ? c.winningIndex : 39,
  };
}

async function readClaimState(userId: string): Promise<{
  weeklyGoals: Record<string, unknown>;
  stored: StoredChestClaim | null;
}> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("user_coaching_state")
    .select("weekly_goals")
    .eq("user_id", userId)
    .maybeSingle();

  const weeklyGoals =
    typeof data?.weekly_goals === "object" && data?.weekly_goals !== null && !Array.isArray(data.weekly_goals)
      ? (data.weekly_goals as Record<string, unknown>)
      : {};

  return { weeklyGoals, stored: readStoredClaim(weeklyGoals) };
}

async function saveClaimState(
  userId: string,
  weeklyGoals: Record<string, unknown>,
  claim: StoredChestClaim,
): Promise<void> {
  const admin = createAdminSupabaseClient();
  const next = { ...weeklyGoals, dailyChest: claim };

  const { error: updateError } = await admin
    .from("user_coaching_state")
    .update({ weekly_goals: next as never })
    .eq("user_id", userId);

  if (!updateError) return;

  const { error: upsertError } = await admin
    .from("user_coaching_state")
    .upsert(
      { user_id: userId, weekly_goals: next as never },
      { onConflict: "user_id" },
    );

  if (upsertError) {
    logger.error("[daily-chest] save claim state failed", {
      userId,
      error: upsertError.message,
    });
    throw new ApiError("INTERNAL_ERROR", "Sandık durumu kaydedilemedi.");
  }
}

export async function getDailyChestStatus(userId: string): Promise<DailyChestStatusDTO> {
  const today = utcToday();

  if (!DAILY_CHEST_LIMIT_ENABLED) {
    return { canClaim: true, nextClaimAt: null, utcDate: today };
  }

  const { stored } = await readClaimState(userId);
  const claimedToday = stored?.date === today;

  return {
    canClaim: !claimedToday,
    nextClaimAt: claimedToday ? nextUtcMidnightIso() : null,
    utcDate: today,
  };
}

export async function claimDailyChest(userId: string): Promise<DailyChestClaimDTO> {
  const today = utcToday();
  const { weeklyGoals, stored } = await readClaimState(userId);

  if (DAILY_CHEST_LIMIT_ENABLED && stored?.date === today) {
    const [gems, streak] = await Promise.all([
      readGemBalance(userId),
      readFreezieBalance(userId),
    ]);
    const fallback = buildLoopingReel(stored.reward);
    return {
      reward: stored.reward,
      reel: stored.reel.length > 0 ? stored.reel : fallback.reel,
      winningIndex: stored.winningIndex,
      gemBalance: gems,
      freezieBalance: streak,
      alreadyClaimed: true,
    };
  }

  const reward = rollChestReward();
  const { reel, stopIndex: winningIndex } = buildLoopingReel(reward);

  let gemBalance = await readGemBalance(userId);
  let freezieBalance = await readFreezieBalance(userId);

  if (reward.kind === "gems") {
    const idempotencyKey = DAILY_CHEST_LIMIT_ENABLED
      ? `daily_chest:${userId}:${today}`
      : `daily_chest:${userId}:${Date.now()}`;
    try {
      const result = await earnGems({
        userId,
        amount: reward.amount,
        type: "daily_chest",
        description: `Daily Kai chest +${reward.amount}`,
        idempotencyKey,
        metadata: { rarity: reward.rarity },
      });
      gemBalance = result.balance ?? gemBalance;
    } catch (error) {
      if (error instanceof ApiError && error.code === "VALIDATION_ERROR") {
        logger.warn("[daily-chest] duplicate gem claim", { userId });
      } else {
        throw error;
      }
    }
  } else if (reward.kind === "freezie") {
    const admin = createAdminSupabaseClient();
    const { data: row } = await admin
      .from("user_streaks")
      .select("freezie_balance")
      .eq("user_id", userId)
      .maybeSingle();
    freezieBalance = (row?.freezie_balance ?? 0) + reward.amount;
    await admin
      .from("user_streaks")
      .update({ freezie_balance: freezieBalance })
      .eq("user_id", userId);
  }

  await saveClaimState(userId, weeklyGoals, {
    date: today,
    reward,
    reel,
    winningIndex,
  });

  return {
    reward,
    reel,
    winningIndex,
    gemBalance,
    freezieBalance,
    alreadyClaimed: false,
  };
}

async function readGemBalance(userId: string): Promise<number> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("user_gem_balances")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();
  return Number(data?.balance ?? 0);
}

async function readFreezieBalance(userId: string): Promise<number> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("user_streaks")
    .select("freezie_balance")
    .eq("user_id", userId)
    .maybeSingle();
  return Number(data?.freezie_balance ?? 0);
}
