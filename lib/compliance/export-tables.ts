/**
 * Canonical list of user-owned tables included in GDPR/KVKK data exports.
 * Keep in sync with tests/compliance/export-completeness.test.ts
 */
export type ExportTableSpec = {
  table: string;
  column: string;
  description: string;
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
  { table: "consent_records", column: "user_id", description: "Legal and AI consent acceptance log" },
  { table: "consent_revocations", column: "user_id", description: "Consent withdrawal log" },
  { table: "notifications", column: "user_id", description: "In-app notifications" },
  { table: "push_subscriptions", column: "user_id", description: "Web push subscription endpoints" },
  { table: "native_push_tokens", column: "user_id", description: "Mobile push notification tokens" },
  { table: "daily_chest_claims", column: "user_id", description: "Daily reward chest claims" },
  { table: "idempotency_keys", column: "user_id", description: "Server idempotency keys for your requests" },
  { table: "ai_usage_ledger", column: "user_id", description: "AI API usage and cost estimates" },
  { table: "billing_events", column: "user_id", description: "Subscription and payment webhook events" },
  { table: "data_export_logs", column: "user_id", description: "History of your data export requests" },
] as const;

export const EXPORT_SCHEMA_VERSION = "2026-07-05";

export function exportSchemaReadme(): Record<string, string> {
  return Object.fromEntries(
    USER_EXPORT_TABLES.map(({ table, description }) => [table, description]),
  );
}
