import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { microToUsd } from "@/lib/ai/cost";

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

/** Service-role cost snapshot for cron jobs (no admin session required). */
export async function getCronCostSnapshot(): Promise<CronCostSnapshot> {
  const admin = createAdminSupabaseClient();
  const today = new Date().toISOString().slice(0, 10);
  const since7d = new Date(Date.now() - 7 * 86400_000).toISOString();

  const { data: todayRows } = await admin
    .from("ai_usage_ledger")
    .select("user_id, total_tokens, estimated_usd_micro")
    .gte("created_at", `${today}T00:00:00Z`);

  const { data: weekRows } = await admin
    .from("ai_usage_ledger")
    .select("estimated_usd_micro, created_at")
    .gte("created_at", since7d);

  let todayMicro = 0;
  let todayTokens = 0;
  const byUser = new Map<string, { tokens: number; micro: number }>();

  for (const row of todayRows ?? []) {
    todayMicro += row.estimated_usd_micro ?? 0;
    todayTokens += row.total_tokens ?? 0;
    if (row.user_id) {
      const cur = byUser.get(row.user_id) ?? { tokens: 0, micro: 0 };
      cur.tokens += row.total_tokens ?? 0;
      cur.micro += row.estimated_usd_micro ?? 0;
      byUser.set(row.user_id, cur);
    }
  }

  const weekMicro = (weekRows ?? []).reduce(
    (sum, r) => sum + (r.estimated_usd_micro ?? 0),
    0,
  );
  const distinctDays = new Set(
    (weekRows ?? []).map((r) => r.created_at.slice(0, 10)),
  ).size;
  const avgDailyUsd = microToUsd(weekMicro) / Math.max(distinctDays, 1);

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
