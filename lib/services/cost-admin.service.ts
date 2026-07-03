import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { microToUsd } from "@/lib/ai/cost";

export type CostSummaryDTO = {
  since: string;
  today: { total_tokens: number; estimated_usd: number; calls: number };
  period: { total_tokens: number; estimated_usd: number; calls: number };
  by_provider: {
    provider: string;
    total_tokens: number;
    estimated_usd: number;
    calls: number;
  }[];
  by_operation: {
    operation: string;
    total_tokens: number;
    estimated_usd: number;
    calls: number;
  }[];
  daily: {
    date: string;
    total_tokens: number;
    estimated_usd: number;
    calls: number;
  }[];
};

export type CostByUserRow = {
  user_id: string;
  display_name: string;
  tier: string;
  total_tokens: number;
  estimated_usd: number;
  calls: number;
};

export type QuotaEventRow = {
  id: string;
  user_id: string;
  display_name: string;
  resource: string;
  event_type: string;
  usage_percent: number | null;
  used: number | null;
  limit_value: number | null;
  created_at: string;
};

export type CostAlertRow = {
  id: string;
  alert_type: string;
  severity: string;
  message: string;
  metadata: unknown;
  acknowledged: boolean;
  created_at: string;
};

export type AdminOverviewDTO = {
  usersTotal: number;
  usersActiveToday: number;
  quotaBlocksToday: number;
  openCostAlerts: number;
  referralsTotal: number;
  costTodayUsd: number;
  costTodayTokens: number;
  degradedMode: boolean;
};

export async function getCostSummary(days = 7): Promise<CostSummaryDTO> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("admin_get_ai_cost_summary", {
    p_days: days,
  });
  if (error) {
    logger.error("[cost-admin] summary rpc error", { error: error.message });
    throw new ApiError("INTERNAL_ERROR", "Maliyet özeti alınamadı.");
  }
  return data as unknown as CostSummaryDTO;
}

export async function getCostByUser(
  days = 7,
  limit = 20,
): Promise<CostByUserRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("admin_get_ai_cost_by_user", {
    p_days: days,
    p_limit: limit,
  });
  if (error) {
    logger.error("[cost-admin] by-user rpc error", { error: error.message });
    throw new ApiError("INTERNAL_ERROR", "Kullanıcı maliyetleri alınamadı.");
  }
  return (data ?? []) as unknown as CostByUserRow[];
}

export async function getQuotaEvents(
  days = 7,
  limit = 30,
): Promise<QuotaEventRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("admin_get_quota_events", {
    p_days: days,
    p_limit: limit,
  });
  if (error) {
    logger.error("[cost-admin] quota events rpc error", { error: error.message });
    throw new ApiError("INTERNAL_ERROR", "Kota olayları alınamadı.");
  }
  return (data ?? []) as unknown as QuotaEventRow[];
}

export async function getAdminOverview(): Promise<AdminOverviewDTO> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("admin_get_overview_stats");
  if (error) {
    logger.error("[cost-admin] overview rpc error", { error: error.message });
    throw new ApiError("INTERNAL_ERROR", "Operatör özeti alınamadı.");
  }

  const stats = data as Record<string, number>;
  let costTodayUsd = 0;
  let costTodayTokens = 0;
  try {
    const summary = await getCostSummary(1);
    costTodayUsd = summary.today.estimated_usd;
    costTodayTokens = summary.today.total_tokens;
  } catch {
    // Ledger empty or migration pending
  }

  const { getDegradedState } = await import("@/lib/resilience/degraded-mode");
  const degraded = await getDegradedState();

  return {
    usersTotal: stats.users_total ?? 0,
    usersActiveToday: stats.users_active_today ?? 0,
    quotaBlocksToday: stats.quota_blocks_today ?? 0,
    openCostAlerts: stats.open_cost_alerts ?? 0,
    referralsTotal: stats.referrals_total ?? 0,
    costTodayUsd,
    costTodayTokens,
    degradedMode: degraded.active,
  };
}

export async function listCostAlerts(limit = 20): Promise<CostAlertRow[]> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("cost_alerts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logger.error("[cost-admin] alerts error", { error: error.message });
    throw new ApiError("INTERNAL_ERROR", "Maliyet alarmları alınamadı.");
  }

  return (data ?? []) as CostAlertRow[];
}

export async function acknowledgeCostAlert(alertId: string): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("cost_alerts")
    .update({ acknowledged: true })
    .eq("id", alertId);
  if (error) {
    throw new ApiError("INTERNAL_ERROR", "Alarm kapatılamadı.");
  }
}

/** Inserts a cost alert (service_role / cron). */
export async function createCostAlert(params: {
  alertType: string;
  severity: "info" | "warn" | "critical";
  message: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("cost_alerts").insert({
    alert_type: params.alertType,
    severity: params.severity,
    message: params.message,
    metadata: (params.metadata ?? null) as never,
  });
  if (error) {
    logger.error("[cost-admin] create alert error", { error: error.message });
  }
}

export type CacheHitStatsDTO = {
  /** Sum of prompt_cache_hit_tokens from ledger metadata (DeepSeek). */
  cache_hit_tokens: number;
  /** Sum of prompt_tokens on the same rows. */
  prompt_tokens: number;
  /** cache_hit / prompt * 100, 0 when no data. */
  cache_ratio_percent: number;
  /** Rows with cache metadata in the period. */
  calls_with_cache: number;
};

/** Aggregates prefix-cache hits from ai_usage_ledger metadata (admin only). */
export async function getCacheHitStats(days = 7): Promise<CacheHitStatsDTO> {
  const admin = createAdminSupabaseClient();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const { data, error } = await admin
    .from("ai_usage_ledger")
    .select("prompt_tokens, metadata")
    .eq("provider", "deepseek")
    .gte("created_at", since)
    .limit(10_000);

  if (error) {
    logger.error("[cost-admin] cache stats error", { error: error.message });
    return {
      cache_hit_tokens: 0,
      prompt_tokens: 0,
      cache_ratio_percent: 0,
      calls_with_cache: 0,
    };
  }

  let cacheHit = 0;
  let promptTotal = 0;
  let callsWithCache = 0;

  for (const row of data ?? []) {
    const meta = row.metadata as Record<string, unknown> | null;
    const hit =
      typeof meta?.prompt_cache_hit_tokens === "number"
        ? meta.prompt_cache_hit_tokens
        : 0;
    if (hit <= 0) continue;
    callsWithCache += 1;
    cacheHit += hit;
    promptTotal += row.prompt_tokens ?? 0;
  }

  return {
    cache_hit_tokens: cacheHit,
    prompt_tokens: promptTotal,
    cache_ratio_percent:
      promptTotal > 0 ? Math.round((cacheHit / promptTotal) * 100) : 0,
    calls_with_cache: callsWithCache,
  };
}

export { microToUsd };
