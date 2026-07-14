import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Hard daily token ceiling per user — blocks AI routes when exceeded. */
export function userDailyTokenHardCap(): number {
  return envInt("AI_COST_USER_DAILY_TOKENS_CAP", 150_000);
}

function utcDayBounds(now = new Date()): { start: string; end: string } {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

/**
 * Rejects AI work when the user has consumed more than the daily hard cap.
 * Uses ai_usage_ledger (UTC day boundary), paginated so PostgREST row caps
 * cannot undercount heavy users.
 */
export async function assertUserDailyAiBudget(userId: string): Promise<void> {
  const cap = userDailyTokenHardCap();
  if (cap <= 0) return;

  try {
    const admin = createAdminSupabaseClient();
    const { start, end } = utcDayBounds();
    const pageSize = 1000;
    let used = 0;
    let from = 0;

    for (;;) {
      const { data, error } = await admin
        .from("ai_usage_ledger")
        .select("total_tokens")
        .eq("user_id", userId)
        .gte("created_at", start)
        .lt("created_at", end)
        .range(from, from + pageSize - 1);

      if (error) {
        logger.error("[daily-cost-cap] ledger read failed", {
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

      if (!data || data.length === 0) break;

      used += data.reduce((sum, row) => sum + Number(row.total_tokens ?? 0), 0);

      if (used >= cap) break;
      if (data.length < pageSize) break;
      from += pageSize;
    }

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
