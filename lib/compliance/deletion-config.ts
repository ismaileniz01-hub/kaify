/**
 * Account deletion behavior registry (Compliance Faz 4).
 * Keep in sync with docs/compliance/deletion-behavior.md and
 * tests/compliance/deletion-completeness.test.ts
 */

export type DeletionBehavior = "cascade" | "set_null" | "explicit_cleanup";

export type DeletionTableSpec = {
  table: string;
  column: string;
  behavior: DeletionBehavior;
  notes: string;
};

/** User-owned tables removed via profiles → auth.users CASCADE. */
export const CASCADE_ON_DELETE_TABLES: readonly DeletionTableSpec[] = [
  { table: "profiles", column: "id", behavior: "cascade", notes: "Root profile row" },
  { table: "gem_ledger", column: "user_id", behavior: "cascade", notes: "" },
  { table: "user_streaks", column: "user_id", behavior: "cascade", notes: "" },
  { table: "user_kai_state", column: "user_id", behavior: "cascade", notes: "" },
  { table: "user_usage_counters", column: "user_id", behavior: "cascade", notes: "" },
  { table: "usage_events", column: "user_id", behavior: "cascade", notes: "" },
  { table: "chat_messages", column: "user_id", behavior: "cascade", notes: "" },
  { table: "user_coaching_state", column: "user_id", behavior: "cascade", notes: "" },
  { table: "coaching_memory", column: "user_id", behavior: "cascade", notes: "" },
  { table: "analytics_daily", column: "user_id", behavior: "cascade", notes: "" },
  { table: "health_steps", column: "user_id", behavior: "cascade", notes: "" },
  { table: "user_market_inventory", column: "user_id", behavior: "cascade", notes: "" },
  { table: "user_settings", column: "user_id", behavior: "cascade", notes: "" },
  { table: "referral_events", column: "referrer_id", behavior: "cascade", notes: "" },
  { table: "streak_gem_claims", column: "user_id", behavior: "cascade", notes: "" },
  { table: "consent_records", column: "user_id", behavior: "cascade", notes: "" },
  { table: "consent_revocations", column: "user_id", behavior: "cascade", notes: "" },
  { table: "notifications", column: "user_id", behavior: "cascade", notes: "" },
  { table: "push_subscriptions", column: "user_id", behavior: "cascade", notes: "" },
  { table: "native_push_tokens", column: "user_id", behavior: "cascade", notes: "" },
  { table: "daily_chest_claims", column: "user_id", behavior: "cascade", notes: "" },
  { table: "idempotency_keys", column: "user_id", behavior: "cascade", notes: "" },
  { table: "ai_usage_ledger", column: "user_id", behavior: "cascade", notes: "Faz 2 — was SET NULL" },
  { table: "data_export_logs", column: "user_id", behavior: "cascade", notes: "" },
] as const;

/** Rows that may survive delete with user_id cleared (financial / audit). */
export const RETAINED_AFTER_DELETE: readonly DeletionTableSpec[] = [
  {
    table: "billing_events",
    column: "user_id",
    behavior: "set_null",
    notes: "Financial audit; customer_email may remain — legal retention 7y",
  },
  {
    table: "admin_audit_log",
    column: "admin_id",
    behavior: "set_null",
    notes: "Admin actions anonymized when admin account deleted",
  },
] as const;

/** Non-FK cleanup performed in deleteUserAccount(). */
export const EXPLICIT_CLEANUP: readonly DeletionTableSpec[] = [
  {
    table: "storage:avatars",
    column: "user_id",
    behavior: "explicit_cleanup",
    notes: "Supabase Storage bucket — not covered by FK cascade",
  },
  {
    table: "auth.users",
    column: "id",
    behavior: "explicit_cleanup",
    notes: "auth.admin.deleteUser triggers profile CASCADE",
  },
] as const;

/** Third-party systems — see docs/compliance/sentry-retention.md */
export const THIRD_PARTY_POST_DELETE = [
  "Sentry (scrubbed events, vendor retention ~90d)",
  "Vercel logs (HTTP, vendor retention)",
  "Paddle (MoR billing records)",
] as const;

export function allUserOwnedExportTablesCovered(): string[] {
  return CASCADE_ON_DELETE_TABLES.map((t) => t.table);
}
