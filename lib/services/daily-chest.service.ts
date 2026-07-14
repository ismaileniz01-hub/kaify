import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { mapRpcError } from "@/lib/supabase/rpc-errors";
import {
  buildLoopingReel,
  CHEST_REEL_CYCLE,
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

/** One claim per UTC day unless explicitly disabled via env. */
const DAILY_CHEST_LIMIT_ENABLED =
  process.env.DAILY_CHEST_LIMIT_ENABLED !== "false";

function utcTodayKey(): string {
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

async function readClaimRow(userId: string, utcDate: string) {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("daily_chest_claims")
    .select("reward_kind, reward_amount, reward_rarity")
    .eq("user_id", userId)
    .eq("utc_date", utcDate)
    .maybeSingle();
  return data;
}

async function readReelState(userId: string, utcDate: string): Promise<StoredChestClaim | null> {
  const admin = createAdminSupabaseClient();
  // reel_state added in 20260714140000 — types lag until regenerate.
  const { data } = await (admin as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (a: string, b: string) => {
          eq: (c: string, d: string) => {
            maybeSingle: () => Promise<{ data: { reel_state?: unknown } | null }>;
          };
        };
      };
    };
  })
    .from("daily_chest_claims")
    .select("reel_state")
    .eq("user_id", userId)
    .eq("utc_date", utcDate)
    .maybeSingle();

  const reelState = data?.reel_state;
  if (!reelState || typeof reelState !== "object" || Array.isArray(reelState)) {
    return null;
  }
  const c = reelState as Record<string, unknown>;
  if (!c.reward || typeof c.reward !== "object") return null;
  const reward = c.reward as ChestRewardDTO;
  if (reward.kind !== "gems" && reward.kind !== "freezie") return null;
  return {
    date: utcDate,
    reward,
    reel: Array.isArray(c.reel) ? (c.reel as ChestReelSlot[]) : [],
    winningIndex: typeof c.winningIndex === "number" ? c.winningIndex : 39,
  };
}

async function saveReelState(
  userId: string,
  claim: StoredChestClaim,
): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { error } = await (admin as unknown as {
    from: (t: string) => {
      update: (row: Record<string, unknown>) => {
        eq: (a: string, b: string) => {
          eq: (
            c: string,
            d: string,
          ) => Promise<{ error: { message: string } | null }>;
        };
      };
    };
  })
    .from("daily_chest_claims")
    .update({
      reel_state: {
        reward: claim.reward,
        reel: claim.reel,
        winningIndex: claim.winningIndex,
      },
    })
    .eq("user_id", userId)
    .eq("utc_date", claim.date);

  if (error) {
    logger.warn("[daily-chest] reel state save failed (non-fatal)", {
      userId,
      error: error.message,
    });
  }
}

function rowToReward(row: {
  reward_kind: string;
  reward_amount: number;
  reward_rarity: string | null;
}): ChestRewardDTO {
  const match = CHEST_REEL_CYCLE.find(
    (r) =>
      r.kind === row.reward_kind &&
      r.amount === row.reward_amount &&
      (row.reward_kind === "freezie" || r.rarity === row.reward_rarity),
  );
  if (match) return match;

  if (row.reward_kind === "freezie") {
    return CHEST_REEL_CYCLE[6];
  }
  return (
    CHEST_REEL_CYCLE.find((r) => r.kind === "gems" && r.amount === row.reward_amount) ??
    CHEST_REEL_CYCLE[0]
  );
}

export async function getDailyChestStatus(userId: string): Promise<DailyChestStatusDTO> {
  const today = utcTodayKey();

  if (!DAILY_CHEST_LIMIT_ENABLED) {
    return { canClaim: true, nextClaimAt: null, utcDate: today };
  }

  const claimRow = await readClaimRow(userId, today);
  const claimedToday = claimRow !== null;

  return {
    canClaim: !claimedToday,
    nextClaimAt: claimedToday ? nextUtcMidnightIso() : null,
    utcDate: today,
  };
}

export async function claimDailyChest(userId: string): Promise<DailyChestClaimDTO> {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.DAILY_CHEST_LIMIT_ENABLED === "false"
  ) {
    throw new ApiError(
      "SERVICE_UNAVAILABLE",
      "Günlük sandık limiti yapılandırması geçersiz.",
    );
  }

  const today = utcTodayKey();
  const idempotencyKey = `daily_chest:${userId}:${today}`;

  if (DAILY_CHEST_LIMIT_ENABLED) {
    const existing = await readClaimRow(userId, today);
    if (existing) {
      const reward = rowToReward(existing);
      const reelState = await readReelState(userId, today);
      const fallback = buildLoopingReel(reward);
      const [gems, streak] = await Promise.all([
        readGemBalance(userId),
        readFreezieBalance(userId),
      ]);
      return {
        reward,
        reel:
          reelState?.date === today && reelState.reel.length > 0
            ? reelState.reel
            : fallback.reel,
        winningIndex: reelState?.winningIndex ?? fallback.stopIndex,
        gemBalance: gems,
        freezieBalance: streak,
        alreadyClaimed: true,
      };
    }
  }

  const reward = rollChestReward();
  const { reel, stopIndex: winningIndex } = buildLoopingReel(reward);

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.rpc("apply_daily_chest_reward", {
    p_user_id: userId,
    p_utc_date: today,
    p_idempotency_key: DAILY_CHEST_LIMIT_ENABLED
      ? idempotencyKey
      : `${idempotencyKey}:${Date.now()}`,
    p_reward_kind: reward.kind,
    p_reward_amount: reward.amount,
    p_reward_rarity: reward.kind === "gems" ? reward.rarity : null,
  });

  if (error) {
    mapRpcError(error, "[daily-chest] apply_daily_chest_reward");
  }

  const payload = data as {
    applied?: boolean;
    duplicate?: boolean;
    gem_balance?: number;
    freezie_balance?: number;
  } | null;

  if (!payload) {
    throw new ApiError("INTERNAL_ERROR", "Sandık ödülü uygulanamadı.");
  }

  if (payload.duplicate) {
    const existing = await readClaimRow(userId, today);
    const resolvedReward = existing ? rowToReward(existing) : reward;
    const reelState = await readReelState(userId, today);
    const fallback = buildLoopingReel(resolvedReward);
    return {
      reward: resolvedReward,
      reel:
        reelState?.date === today && reelState.reel.length > 0
          ? reelState.reel
          : fallback.reel,
      winningIndex: reelState?.winningIndex ?? fallback.stopIndex,
      gemBalance: Number(payload.gem_balance ?? 0),
      freezieBalance: Number(payload.freezie_balance ?? 0),
      alreadyClaimed: true,
    };
  }

  await saveReelState(userId, { date: today, reward, reel, winningIndex });

  return {
    reward,
    reel,
    winningIndex,
    gemBalance: Number(payload.gem_balance ?? 0),
    freezieBalance: Number(payload.freezie_balance ?? 0),
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
