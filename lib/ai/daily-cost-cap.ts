import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api/errors";
import { cacheGet, cacheSet } from "@/lib/cache";
import { logger } from "@/lib/logger";
import { enterDegradedMode } from "@/lib/resilience/degraded-mode";
import { getCronCostSnapshot } from "@/lib/services/cost-cron.service";
import { microToUsd } from "@/lib/ai/cost";

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function envFloat(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Hard daily token ceiling per user — blocks AI routes when exceeded. */
export function userDailyTokenHardCap(): number {
  return envInt("AI_COST_USER_DAILY_TOKENS_CAP", 150_000);
}

/**
 * Platform-wide daily USD hard cap. Default $75 protects ~10k soft launch.
 * Set AI_COST_PLATFORM_DAILY_USD_CAP=0 to disable.
 */
export function platformDailyUsdHardCap(): number {
  return envFloat("AI_COST_PLATFORM_DAILY_USD_CAP", 75);
}

/** Soft threshold (0–1 of hard cap) that enables pressure mode (skip optional AI). */
export function platformPressureRatio(): number {
  const r = envFloat("AI_COST_PLATFORM_PRESSURE_RATIO", 0.7);
  return Math.min(Math.max(r, 0.1), 0.99);
}

const PLATFORM_SPEND_CACHE_KEY = "ai:platform-spend:v1";
const PLATFORM_SPEND_TTL_SEC = 45;
const AI_PRESSURE_KEY = "sys:ai-pressure";

function utcDayBounds(now = new Date()): { date: string } {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  return { date: start.toISOString().slice(0, 10) };
}

export type PlatformSpendSnapshot = {
  todayUsd: number;
  todayTokens: number;
};

async function loadPlatformSpend(): Promise<PlatformSpendSnapshot> {
  const cached = await cacheGet<PlatformSpendSnapshot>(PLATFORM_SPEND_CACHE_KEY);
  if (cached) return cached;

  try {
    const admin = createAdminSupabaseClient();
    const { date } = utcDayBounds();
    const { data, error } = await admin
      .from("ai_platform_daily_usage")
      .select("total_tokens, estimated_usd_micro")
      .eq("usage_date", date)
      .maybeSingle();

    if (!error) {
      const value = {
        todayUsd: microToUsd(Number(data?.estimated_usd_micro ?? 0)),
        todayTokens: Number(data?.total_tokens ?? 0),
      };
      await cacheSet(PLATFORM_SPEND_CACHE_KEY, value, PLATFORM_SPEND_TTL_SEC);
      return value;
    }

    logger.warn("[daily-cost-cap] platform aggregate unavailable, using cron snapshot", {
      error: error.message,
    });
    const snap = await getCronCostSnapshot();
    const value = { todayUsd: snap.todayUsd, todayTokens: snap.todayTokens };
    await cacheSet(PLATFORM_SPEND_CACHE_KEY, value, PLATFORM_SPEND_TTL_SEC);
    return value;
  } catch (error) {
    logger.error("[daily-cost-cap] platform spend load failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    throw error;
  }
}

export async function isAiPressureMode(): Promise<boolean> {
  const flagged = await cacheGet<{ active: boolean }>(AI_PRESSURE_KEY);
  if (flagged?.active) return true;

  const hard = platformDailyUsdHardCap();
  if (hard <= 0) return false;

  try {
    const spend = await loadPlatformSpend();
    return spend.todayUsd >= hard * platformPressureRatio();
  } catch {
    return false;
  }
}

async function setPressureFlag(active: boolean, reason: string): Promise<void> {
  const current = await cacheGet<{ active?: boolean }>(AI_PRESSURE_KEY);
  if (Boolean(current?.active) === active) return;
  if (active) {
    await cacheSet(AI_PRESSURE_KEY, { active: true, reason }, 900);
  } else {
    await cacheSet(AI_PRESSURE_KEY, { active: false }, 60);
  }
}

/**
 * Rejects AI work when platform daily USD spend exceeds the hard cap.
 * Also toggles pressure mode above the soft ratio.
 */
export async function assertPlatformDailyAiBudget(): Promise<void> {
  const hard = platformDailyUsdHardCap();
  if (hard <= 0) return;

  try {
    const spend = await loadPlatformSpend();
    const soft = hard * platformPressureRatio();

    if (spend.todayUsd >= soft) {
      await setPressureFlag(true, `platform spend $${spend.todayUsd.toFixed(2)} >= soft $${soft.toFixed(2)}`);
    } else {
      await setPressureFlag(false, "ok");
    }

    if (spend.todayUsd >= hard) {
      await enterDegradedMode(
        `Platform daily AI spend cap reached ($${spend.todayUsd.toFixed(2)} / $${hard})`,
      );
      throw new ApiError(
        "SERVICE_UNAVAILABLE",
        "AI hizmeti bugün için maliyet limitine ulaştı. Lütfen yarın tekrar dene.",
        { todayUsd: spend.todayUsd, cap: hard, resource: "platform_daily_usd" },
      );
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error("[daily-cost-cap] platform budget unexpected error", {
      error: error instanceof Error ? error.message : "unknown",
    });
    if (process.env.NODE_ENV === "production") {
      throw new ApiError(
        "SERVICE_UNAVAILABLE",
        "AI maliyet limiti doğrulanamadı. Lütfen daha sonra tekrar dene.",
      );
    }
  }
}

/**
 * Rejects AI work when the user has consumed more than the daily hard cap.
 * Reads the UTC-day aggregate (trigger-maintained from ai_usage_ledger).
 */
export async function assertUserDailyAiBudget(userId: string): Promise<void> {
  const cap = userDailyTokenHardCap();
  if (cap <= 0) return;

  try {
    const admin = createAdminSupabaseClient();
    const { date } = utcDayBounds();
    const { data, error } = await admin
      .from("ai_daily_usage")
      .select("total_tokens")
      .eq("user_id", userId)
      .eq("usage_date", date)
      .maybeSingle();

    if (error) {
      logger.error("[daily-cost-cap] daily aggregate read failed", {
        userId,
        error: error.message,
      });
      if (process.env.NODE_ENV === "production") {
        throw new ApiError(
          "SERVICE_UNAVAILABLE",
          "AI kullanım limiti doğrulanamadı. Lütfen daha sonra tekrar dene.",
        );
      }
      return;
    }

    const used = Number(data?.total_tokens ?? 0);
    if (used >= cap) {
      throw new ApiError(
        "FORBIDDEN",
        "Günlük AI kullanım limitine ulaştın. Yarın tekrar deneyebilirsin.",
        { used, cap, resource: "daily_ai_tokens" },
      );
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error("[daily-cost-cap] unexpected error", {
      userId,
      error: error instanceof Error ? error.message : "unknown",
    });
    if (process.env.NODE_ENV === "production") {
      throw new ApiError(
        "SERVICE_UNAVAILABLE",
        "AI kullanım limiti doğrulanamadı. Lütfen daha sonra tekrar dene.",
      );
    }
  }
}
