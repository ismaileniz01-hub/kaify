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
  {
    table: "consent_records",
    column: "user_id",
    behavior: "cascade",
    notes:
      "Current approved behavior; any post-delete archive requires a versioned legal/privacy decision.",
  },
  {
    table: "consent_revocations",
    column: "user_id",
    behavior: "cascade",
    notes:
      "Current approved behavior; any post-delete archive requires a versioned legal/privacy decision.",
  },
  { table: "notifications", column: "user_id", behavior: "cascade", notes: "" },
  { table: "push_subscriptions", column: "user_id", behavior: "cascade", notes: "" },
  { table: "native_push_tokens", column: "user_id", behavior: "cascade", notes: "" },
  { table: "daily_chest_claims", column: "user_id", behavior: "cascade", notes: "" },
  { table: "idempotency_keys", column: "user_id", behavior: "cascade", notes: "" },
  { table: "ai_usage_ledger", column: "user_id", behavior: "cascade", notes: "Faz 2 — was SET NULL" },
  { table: "ai_daily_usage", column: "user_id", behavior: "cascade", notes: "Daily AI token aggregate" },
  { table: "data_export_logs", column: "user_id", behavior: "cascade", notes: "" },
  { table: "pending_gifts", column: "user_id", behavior: "cascade", notes: "" },
  { table: "support_tickets", column: "user_id", behavior: "cascade", notes: "" },
  { table: "support_messages", column: "ticket_id", behavior: "cascade", notes: "Owned via support_tickets" },
  { table: "analytics_pending_confirmations", column: "user_id", behavior: "cascade", notes: "" },
  { table: "scan_corrections", column: "user_id", behavior: "cascade", notes: "" },
  { table: "team_meeting_weeks", column: "user_id", behavior: "cascade", notes: "" },
  { table: "referrals", column: "referrer_id", behavior: "cascade", notes: "" },
  { table: "workout_plans", column: "user_id", behavior: "cascade", notes: "" },
  { table: "workout_plan_items", column: "user_id", behavior: "cascade", notes: "" },
  { table: "workout_sessions", column: "user_id", behavior: "cascade", notes: "" },
  { table: "workout_set_logs", column: "user_id", behavior: "cascade", notes: "" },
] as const;

/** Rows that may survive delete with user_id cleared (financial / audit). */
export const RETAINED_AFTER_DELETE: readonly DeletionTableSpec[] = [
  {
    table: "billing_events",
    column: "user_id",
    behavior: "set_null",
    notes: "Financial audit row retained (SET NULL); payload is minimized at insert. Row TTL: RETENTION.billingEventsMonths (policy 7y).",
  },
  {
    table: "product_events",
    column: "user_id",
    behavior: "set_null",
    notes: "Lifecycle projection retained without user id after delete; TTL pending legal approval.",
  },
  {
    table: "paddle_customers",
    column: "user_id",
    behavior: "set_null",
    notes: "Paddle customer mirror retained for billing reconciliation",
  },
  {
    table: "paddle_subscriptions",
    column: "user_id",
    behavior: "set_null",
    notes: "Paddle subscription mirror retained for billing reconciliation",
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
    table: "cache:user",
    column: "user_id",
    behavior: "explicit_cleanup",
    notes: "Upstash/Redis user-derived keys via purgeUserCaches()",
  },
  {
    table: "auth.users",
    column: "id",
    behavior: "explicit_cleanup",
    notes: "auth.admin.deleteUser triggers profile CASCADE",
  },
  {
    table: "paddle:subscriptions",
    column: "user_id",
    behavior: "explicit_cleanup",
    notes: "cancelUserSubscriptionsImmediately() before auth delete so MoR billing stops",
  },
] as const;

/** Third-party systems — see docs/compliance/sentry-retention.md */
export const THIRD_PARTY_POST_DELETE = [
  "Sentry (scrubbed events, vendor retention ~90d)",
  "Vercel logs (HTTP, vendor retention)",
  "Paddle (MoR billing records; live subscriptions canceled immediately on account delete)",
] as const;

export function allUserOwnedExportTablesCovered(): string[] {
  return CASCADE_ON_DELETE_TABLES.map((t) => t.table);
}
