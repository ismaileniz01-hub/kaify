/**
 * Classification of public SECURITY DEFINER functions.
 * Completeness is enforced at runtime against pg_proc when DB tests run.
 *
 * Original audit counted 43 names; Wave 5 clean schema has 41 SECURITY DEFINER functions.
 * The 4 removed names are NOT prosecdef on live schema:
 *   build_usage_node, is_valid_timezone, set_updated_at, protect_profile_columns.
 */
export type RpcAccessMode =
  | "client_callable"
  | "service_only"
  | "trigger_only"
  | "internal";

export type RpcRegistryEntry = {
  name: string;
  mode: RpcAccessMode;
  note?: string;
};

/** Live clean-schema SECURITY DEFINER count (pg_proc.prosecdef). */
export const AUDIT_SECURITY_DEFINER_COUNT = 41;

export const RPC_REGISTRY: readonly RpcRegistryEntry[] = [
  // ---- client_callable (EXECUTE granted to authenticated and/or anon) ----
  { name: "activate_user", mode: "client_callable" },
  { name: "claim_pending_gift", mode: "client_callable" },
  { name: "complete_onboarding", mode: "client_callable" },
  { name: "get_usage_status", mode: "client_callable" },
  { name: "get_user_rank", mode: "client_callable" },
  { name: "is_admin", mode: "client_callable" },
  { name: "mark_notifications_read", mode: "client_callable" },
  {
    name: "admin_get_cache_hit_stats",
    mode: "client_callable",
    note: "EXECUTE to authenticated; body gated by is_admin()/service_role",
  },
  {
    name: "get_country_leaderboard",
    mode: "client_callable",
    note: "anon + authenticated; no user identifiers",
  },

  // ---- service_only (PostgREST: authenticated EXECUTE must fail) ----
  {
    name: "get_global_leaderboard",
    mode: "service_only",
    note: "SEC-009: returns raw user_id; HTTP API only (service_role). Not PostgREST for anon/authenticated",
  },
  { name: "admin_create_pending_gift", mode: "service_only" },
  { name: "admin_get_ai_cost_by_user", mode: "service_only" },
  { name: "admin_get_ai_cost_summary", mode: "service_only" },
  { name: "admin_get_overview_stats", mode: "service_only" },
  { name: "admin_get_quota_events", mode: "service_only" },
  { name: "apply_daily_chest_reward", mode: "service_only" },
  { name: "apply_subscription", mode: "service_only" },
  { name: "check_and_increment_usage", mode: "service_only" },
  { name: "claim_pending_streak_rewards", mode: "service_only" },
  { name: "claim_streak_gem_rewards", mode: "service_only" },
  { name: "confirm_analytics_pending", mode: "service_only" },
  { name: "earn_gems", mode: "service_only" },
  { name: "grant_freezie", mode: "service_only" },
  { name: "increment_analytics_meals", mode: "service_only" },
  { name: "perform_daily_check_in", mode: "service_only", note: "faz0 locked to service_role" },
  { name: "process_referral", mode: "service_only" },
  { name: "purchase_market_item", mode: "service_only" },
  { name: "record_cron_run", mode: "service_only" },
  { name: "refund_usage", mode: "service_only" },
  { name: "require_service_role", mode: "service_only" },
  { name: "service_get_ai_cost_snapshot", mode: "service_only" },
  { name: "service_get_outbox_backlog", mode: "service_only" },
  { name: "set_active_aura", mode: "service_only" },
  { name: "spend_gems", mode: "service_only" },
  { name: "upsert_analytics_daily", mode: "service_only" },
  { name: "increment_condense_counter", mode: "service_only" },
  { name: "reconcile_ai_daily_usage", mode: "service_only" },

  // ---- trigger_only (SECURITY DEFINER) ----
  { name: "handle_new_user", mode: "trigger_only" },
  { name: "trg_unlock_team_chat_on_streak", mode: "trigger_only" },
  { name: "trg_ai_usage_ledger_daily_agg", mode: "trigger_only" },

  // ---- internal helpers that ARE SECURITY DEFINER ----
  {
    name: "generate_referral_code",
    mode: "internal",
    note: "Called from handle_new_user; not a client RPC",
  },
] as const;

export function rpcNames(): string[] {
  return RPC_REGISTRY.map((e) => e.name).sort();
}

export function rpcByMode(mode: RpcAccessMode): RpcRegistryEntry[] {
  return RPC_REGISTRY.filter((e) => e.mode === mode);
}
