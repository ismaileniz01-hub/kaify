/**
 * Canonical list of user-owned tables included in GDPR/KVKK data exports.
 * Keep in sync with tests/compliance/export-completeness.test.ts
 */
export type ExportTableSpec = {
  table: string;
  column: string;
  description: string;
  ownerRelation?: {
    table: string;
    ownerColumn: string;
  };
};

export const USER_EXPORT_TABLES: readonly ExportTableSpec[] = [
  { table: "gem_ledger", column: "user_id", description: "Virtual currency transaction history" },
  { table: "user_streaks", column: "user_id", description: "Workout streak counters" },
  { table: "user_kai_state", column: "user_id", description: "Kai companion state and rewards" },
  { table: "user_usage_counters", column: "user_id", description: "AI quota usage counters" },
  { table: "usage_events", column: "user_id", description: "Quota warning and limit events" },
  { table: "chat_messages", column: "user_id", description: "AI coach chat history" },
  { table: "user_coaching_state", column: "user_id", description: "Per-coach conversation state" },
  { table: "coaching_memory", column: "user_id", description: "Condensed coaching memory summaries" },
  { table: "analytics_daily", column: "user_id", description: "Daily fitness analytics aggregates" },
  { table: "health_steps", column: "user_id", description: "Step count records" },
  { table: "user_market_inventory", column: "user_id", description: "Purchased market items" },
  { table: "user_settings", column: "user_id", description: "Notification and display preferences" },
  { table: "referral_events", column: "referrer_id", description: "Referral reward events you triggered" },
  { table: "streak_gem_claims", column: "user_id", description: "Streak milestone gem reward claims" },
  { table: "consent_records", column: "user_id", description: "Legal and AI consent acceptance log" },
  { table: "consent_revocations", column: "user_id", description: "Consent withdrawal log" },
  { table: "notifications", column: "user_id", description: "In-app notifications" },
  { table: "push_subscriptions", column: "user_id", description: "Web push subscription endpoints" },
  { table: "native_push_tokens", column: "user_id", description: "Mobile push notification tokens" },
  { table: "daily_chest_claims", column: "user_id", description: "Daily reward chest claims" },
  { table: "idempotency_keys", column: "user_id", description: "Server idempotency keys for your requests" },
  { table: "ai_usage_ledger", column: "user_id", description: "AI API usage and cost estimates" },
  { table: "ai_daily_usage", column: "user_id", description: "Daily AI token and cost counters" },
  { table: "billing_events", column: "user_id", description: "Subscription and payment webhook events" },
  { table: "paddle_customers", column: "user_id", description: "Linked Paddle customer billing identity" },
  { table: "paddle_subscriptions", column: "user_id", description: "Mirrored Paddle subscription status" },
  { table: "data_export_logs", column: "user_id", description: "History of your data export requests" },
  { table: "pending_gifts", column: "user_id", description: "Unclaimed admin or referral gifts" },
  { table: "support_tickets", column: "user_id", description: "Support tickets you opened" },
  {
    table: "support_messages",
    column: "ticket_id",
    ownerRelation: { table: "support_tickets", ownerColumn: "user_id" },
    description: "Messages in support tickets you opened",
  },
  { table: "analytics_pending_confirmations", column: "user_id", description: "Pending fitness log confirmations" },
  { table: "scan_corrections", column: "user_id", description: "Numeric meal or scan corrections you submitted" },
  { table: "team_meeting_weeks", column: "user_id", description: "Weekly Coach Council lock records" },
  { table: "referrals", column: "referrer_id", description: "Referral codes and edges you created" },
  { table: "workout_plans", column: "user_id", description: "Applied versioned workout plans" },
  { table: "workout_plan_items", column: "user_id", description: "Prescription rows for applied workout plans" },
  { table: "workout_sessions", column: "user_id", description: "Completed, missed, rest, and deload session history" },
  { table: "workout_set_logs", column: "user_id", description: "Per-set reps and load for completed sessions" },
] as const;

export const EXPORT_SCHEMA_VERSION = "2026-08-26";

export function exportSchemaReadme(): Record<string, string> {
  return Object.fromEntries(
    USER_EXPORT_TABLES.map(({ table, description }) => [table, description]),
  );
}
