/**
 * Expected access mode for every public base table.
 * Completeness is enforced at runtime against information_schema when DB tests run.
 */
export type TableAccessMode =
  | "user_own"
  | "service_only"
  | "authenticated_read"
  | "skip_reason";

export type SchemaRegistryEntry = {
  table: string;
  mode: TableAccessMode;
  /** Column that identifies the owning user (user_own tables). */
  ownerColumn?: "id" | "user_id" | "referrer_id" | "admin_id";
  /** When mode === skip_reason, explain why runtime RLS matrix is skipped. */
  skipReason?: string;
  /** Optional note for seed / diagnostics. */
  note?: string;
};

/**
 * High-risk user-owned tables exercised by the live RLS suite.
 * Prefer tables with a direct owner column and SELECT (and denied write) policies.
 */
export const SCHEMA_REGISTRY: readonly SchemaRegistryEntry[] = [
  // ---- user_own ----
  { table: "profiles", mode: "user_own", ownerColumn: "id" },
  { table: "gem_ledger", mode: "user_own", ownerColumn: "user_id", note: "select-only" },
  { table: "user_streaks", mode: "user_own", ownerColumn: "user_id", note: "select-only" },
  { table: "user_kai_state", mode: "user_own", ownerColumn: "user_id", note: "select-only" },
  { table: "user_usage_counters", mode: "user_own", ownerColumn: "user_id", note: "select-only" },
  { table: "usage_events", mode: "user_own", ownerColumn: "user_id", note: "select-only" },
  { table: "chat_messages", mode: "user_own", ownerColumn: "user_id", note: "select-only" },
  { table: "user_coaching_state", mode: "user_own", ownerColumn: "user_id", note: "select-only" },
  { table: "coaching_memory", mode: "user_own", ownerColumn: "user_id", note: "select-only" },
  { table: "analytics_daily", mode: "user_own", ownerColumn: "user_id", note: "select-only" },
  { table: "health_steps", mode: "user_own", ownerColumn: "user_id", note: "select-only" },
  { table: "user_market_inventory", mode: "user_own", ownerColumn: "user_id", note: "select-only" },
  { table: "user_settings", mode: "user_own", ownerColumn: "user_id" },
  { table: "referrals", mode: "user_own", ownerColumn: "referrer_id", note: "select via referrer" },
  { table: "referral_events", mode: "user_own", ownerColumn: "referrer_id", note: "select-only" },
  { table: "notifications", mode: "user_own", ownerColumn: "user_id", note: "select-only" },
  { table: "push_subscriptions", mode: "user_own", ownerColumn: "user_id", note: "select-only" },
  { table: "native_push_tokens", mode: "user_own", ownerColumn: "user_id", note: "select-only" },
  { table: "daily_chest_claims", mode: "user_own", ownerColumn: "user_id", note: "select-only" },
  { table: "streak_gem_claims", mode: "user_own", ownerColumn: "user_id", note: "select-only" },
  { table: "consent_records", mode: "user_own", ownerColumn: "user_id", note: "select-only" },
  { table: "consent_revocations", mode: "user_own", ownerColumn: "user_id", note: "select-only" },
  { table: "data_export_logs", mode: "user_own", ownerColumn: "user_id", note: "select-only" },
  { table: "paddle_customers", mode: "user_own", ownerColumn: "user_id", note: "select-only" },
  { table: "paddle_subscriptions", mode: "user_own", ownerColumn: "user_id", note: "select-only" },
  { table: "pending_gifts", mode: "user_own", ownerColumn: "user_id", note: "select-only" },
  { table: "support_tickets", mode: "user_own", ownerColumn: "user_id" },
  {
    table: "analytics_pending_confirmations",
    mode: "user_own",
    ownerColumn: "user_id",
    note: "select-only",
  },
  { table: "team_meeting_weeks", mode: "user_own", ownerColumn: "user_id", note: "select-only" },
  { table: "scan_corrections", mode: "user_own", ownerColumn: "user_id", note: "select-only" },

  // ---- authenticated_read (catalog / public catalog rows) ----
  { table: "tier_limits", mode: "authenticated_read" },
  { table: "coaches", mode: "authenticated_read" },
  { table: "market_items", mode: "authenticated_read" },

  // ---- service_only / deny for normal authenticated ----
  { table: "admin_audit_log", mode: "service_only", note: "admin policy; non-admin denied" },
  { table: "ai_usage_ledger", mode: "service_only" },
  { table: "ai_daily_usage", mode: "service_only" },
  { table: "ai_platform_daily_usage", mode: "service_only" },
  { table: "backup_verification_runs", mode: "service_only" },
  { table: "billing_events", mode: "service_only", note: "grants revoked in faz1" },
  { table: "cost_alerts", mode: "service_only" },
  { table: "cron_job_runs", mode: "service_only" },
  { table: "domain_events", mode: "service_only" },
  { table: "product_events", mode: "service_only" },
  { table: "idempotency_keys", mode: "service_only" },
  { table: "influencer_codes", mode: "service_only", note: "select revoked" },
  { table: "leaderboard_snapshots", mode: "service_only" },
  { table: "retention_purge_runs", mode: "service_only" },

  // ---- skip (indirect ownership / awkward seed) ----
  {
    table: "support_messages",
    mode: "skip_reason",
    skipReason: "Ownership is via support_tickets join; covered indirectly by support_tickets tests",
  },
] as const;

export function registryTableNames(): string[] {
  return SCHEMA_REGISTRY.map((e) => e.table).sort();
}

export function entriesByMode(mode: TableAccessMode): SchemaRegistryEntry[] {
  return SCHEMA_REGISTRY.filter((e) => e.mode === mode);
}
