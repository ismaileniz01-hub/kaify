import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { microToUsd } from "@/lib/ai/cost";
import { logger } from "@/lib/logger";

export type CronCostSnapshot = {
  todayUsd: number;
  todayTokens: number;
  avgDailyUsd: number;
  topUsersToday: {
    user_id: string;
    display_name: string;
    total_tokens: number;
    estimated_usd: number;
  }[];
};

type SnapshotRpc = {
  today_usd_micro?: number;
  today_tokens?: number;
  week_usd_micro?: number;
  week_distinct_days?: number;
  top_users?: Array<{
    user_id?: string;
    display_name?: string;
    total_tokens?: number;
    estimated_usd_micro?: number;
  }>;
};

/** Paginated fallback when service_get_ai_cost_snapshot migration is not applied. */
async function getCronCostSnapshotPaged(): Promise<CronCostSnapshot> {
  const admin = createAdminSupabaseClient();
  const today = new Date().toISOString().slice(0, 10);
  const since7d = new Date(Date.now() - 7 * 86400_000).toISOString();
  const pageSize = 1000;

  let todayMicro = 0;
  let todayTokens = 0;
  const byUser = new Map<string, { tokens: number; micro: number }>();
  let from = 0;

  for (;;) {
    const { data, error } = await admin
      .from("ai_usage_ledger")
      .select("user_id, total_tokens, estimated_usd_micro")
      .gte("created_at", `${today}T00:00:00Z`)
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const row of data) {
      todayMicro += row.estimated_usd_micro ?? 0;
      todayTokens += row.total_tokens ?? 0;
      if (row.user_id) {
        const cur = byUser.get(row.user_id) ?? { tokens: 0, micro: 0 };
        cur.tokens += row.total_tokens ?? 0;
        cur.micro += row.estimated_usd_micro ?? 0;
        byUser.set(row.user_id, cur);
      }
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }

  let weekMicro = 0;
  const daySet = new Set<string>();
  from = 0;
  for (;;) {
    const { data, error } = await admin
      .from("ai_usage_ledger")
      .select("estimated_usd_micro, created_at")
      .gte("created_at", since7d)
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const row of data) {
      weekMicro += row.estimated_usd_micro ?? 0;
      if (row.created_at) daySet.add(row.created_at.slice(0, 10));
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }

  const avgDailyUsd = microToUsd(weekMicro) / Math.max(daySet.size, 1);
  const topUserIds = [...byUser.entries()]
    .sort((a, b) => b[1].tokens - a[1].tokens)
    .slice(0, 50);

  const profiles = new Map<string, string>();
  if (topUserIds.length > 0) {
    const { data: profs } = await admin
      .from("profiles")
      .select("id, display_name")
      .in(
        "id",
        topUserIds.map(([id]) => id),
      );
    for (const p of profs ?? []) {
      profiles.set(p.id, p.display_name);
    }
  }

  return {
    todayUsd: microToUsd(todayMicro),
    todayTokens,
    avgDailyUsd,
    topUsersToday: topUserIds.map(([user_id, stats]) => ({
      user_id,
      display_name: profiles.get(user_id) ?? "Unknown",
      total_tokens: stats.tokens,
      estimated_usd: microToUsd(stats.micro),
    })),
  };
}

/** Service-role cost snapshot for cron jobs (no admin session required). */
export async function getCronCostSnapshot(): Promise<CronCostSnapshot> {
  const admin = createAdminSupabaseClient();

  try {
    const { data, error } = await admin.rpc("service_get_ai_cost_snapshot");
    if (!error && data) {
      const row = data as SnapshotRpc;
      const days = Math.max(Number(row.week_distinct_days ?? 1), 1);
      return {
        todayUsd: microToUsd(Number(row.today_usd_micro ?? 0)),
        todayTokens: Number(row.today_tokens ?? 0),
        avgDailyUsd: microToUsd(Number(row.week_usd_micro ?? 0)) / days,
        topUsersToday: (row.top_users ?? []).map((u) => ({
          user_id: String(u.user_id ?? ""),
          display_name: String(u.display_name ?? "Unknown"),
          total_tokens: Number(u.total_tokens ?? 0),
          estimated_usd: microToUsd(Number(u.estimated_usd_micro ?? 0)),
        })),
      };
    }
    if (error) {
      logger.warn("[cost-cron] snapshot rpc unavailable, paging ledger", {
        error: error.message,
      });
    }
  } catch (error) {
    logger.warn("[cost-cron] snapshot rpc threw, paging ledger", {
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  return getCronCostSnapshotPaged();
}
