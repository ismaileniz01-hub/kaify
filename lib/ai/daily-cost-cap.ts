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

/**
 * Rejects AI work when the user has consumed more than the daily hard cap.
 * Uses ai_usage_ledger (UTC day boundary).
 */
export async function assertUserDailyAiBudget(userId: string): Promise<void> {
  const cap = userDailyTokenHardCap();
  if (cap <= 0) return;

  try {
    const admin = createAdminSupabaseClient();
    const today = new Date().toISOString().slice(0, 10);

    const { data, error } = await admin
      .from("ai_usage_ledger")
      .select("total_tokens")
      .eq("user_id", userId)
      .gte("created_at", `${today}T00:00:00Z`)
      .lt("created_at", `${today}T23:59:59.999Z`);

    if (error) {
      logger.warn("[daily-cost-cap] ledger read failed", { userId, error: error.message });
      return;
    }

    const used = (data ?? []).reduce(
      (sum, row) => sum + Number(row.total_tokens ?? 0),
      0,
    );

    if (used >= cap) {
      throw new ApiError(
        "FORBIDDEN",
        "Günlük AI kullanım limitine ulaştın. Yarın tekrar deneyebilirsin.",
        { used, cap, resource: "daily_ai_tokens" },
      );
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.warn("[daily-cost-cap] unexpected error", {
      userId,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}
