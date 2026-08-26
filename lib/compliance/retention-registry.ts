import { RETENTION } from "@/lib/compliance/retention-config";

export type RetentionClass =
  | "LEGAL_AUDIT"
  | "PRODUCT_HISTORY"
  | "OPERATIONAL_SHORT_LIVED"
  | "INDEFINITE_BY_DESIGN"
  | "NEEDS_POLICY";

export type RetentionRegistryEntry = {
  table: string;
  classification: RetentionClass;
  /** Months, days, or null when indefinite / no automated purge. */
  retainMonths?: number;
  retainDays?: number;
  rationale: string;
  purged: boolean;
};

/**
 * Canonical retention decision for every public base table.
 * Completeness is enforced against SCHEMA_REGISTRY in tests/db.
 */
export const RETENTION_REGISTRY: readonly RetentionRegistryEntry[] = [
  { table: "profiles", classification: "INDEFINITE_BY_DESIGN", purged: false, rationale: "Account identity; deleted only on account deletion." },
  { table: "gem_ledger", classification: "LEGAL_AUDIT", purged: false, rationale: "Append-only audit for gem_balance reconciliation; account deletion still cascades." },
  { table: "user_streaks", classification: "INDEFINITE_BY_DESIGN", purged: false, rationale: "Current streak is live product state." },
  { table: "user_kai_state", classification: "INDEFINITE_BY_DESIGN", purged: false, rationale: "Includes materialized gem_balance; live product state." },
  { table: "user_usage_counters", classification: "INDEFINITE_BY_DESIGN", purged: false, rationale: "Current quota counters; period rows recycle in-place." },
  { table: "usage_events", classification: "OPERATIONAL_SHORT_LIVED", retainMonths: RETENTION.usageEventsMonths, purged: true, rationale: "Quota audit trail; not user-visible history." },
  { table: "chat_messages", classification: "PRODUCT_HISTORY", retainMonths: RETENTION.chatMonths, purged: true, rationale: "Coach history; GDPR retention window." },
  { table: "user_coaching_state", classification: "INDEFINITE_BY_DESIGN", purged: false, rationale: "Current coaching preferences." },
  { table: "coaching_memory", classification: "PRODUCT_HISTORY", retainMonths: RETENTION.coachingMemoryMonths, purged: true, rationale: "Derived memory from chat." },
  { table: "analytics_daily", classification: "PRODUCT_HISTORY", retainMonths: RETENTION.analyticsMonths, purged: true, rationale: "User-visible analytics history." },
  { table: "health_steps", classification: "PRODUCT_HISTORY", retainMonths: RETENTION.healthStepsMonths, purged: true, rationale: "Synced step history." },
  { table: "user_market_inventory", classification: "INDEFINITE_BY_DESIGN", purged: false, rationale: "Owned cosmetics; not high-churn events." },
  { table: "user_settings", classification: "INDEFINITE_BY_DESIGN", purged: false, rationale: "Current preferences." },
  { table: "referrals", classification: "INDEFINITE_BY_DESIGN", purged: false, rationale: "Active referral edges." },
  { table: "referral_events", classification: "PRODUCT_HISTORY", retainMonths: RETENTION.referralEventsMonths, purged: true, rationale: "Referral audit; not billing." },
  { table: "notifications", classification: "OPERATIONAL_SHORT_LIVED", retainMonths: RETENTION.notificationsMonths, purged: true, rationale: "In-app inbox." },
  { table: "push_subscriptions", classification: "INDEFINITE_BY_DESIGN", purged: false, rationale: "Live device endpoints until user removes." },
  { table: "native_push_tokens", classification: "INDEFINITE_BY_DESIGN", purged: false, rationale: "Live device tokens." },
  { table: "daily_chest_claims", classification: "INDEFINITE_BY_DESIGN", purged: false, rationale: "Idempotent daily claim keys; small." },
  { table: "streak_gem_claims", classification: "INDEFINITE_BY_DESIGN", purged: false, rationale: "Idempotent reward claims." },
  { table: "consent_records", classification: "LEGAL_AUDIT", purged: false, rationale: "Proof of consent; account deletion separate." },
  { table: "consent_revocations", classification: "LEGAL_AUDIT", purged: false, rationale: "Proof of withdrawal." },
  { table: "data_export_logs", classification: "LEGAL_AUDIT", retainMonths: RETENTION.dataExportLogsMonths, purged: true, rationale: "DSAR export audit." },
  { table: "paddle_customers", classification: "LEGAL_AUDIT", purged: false, rationale: "Billing identity map." },
  { table: "paddle_subscriptions", classification: "LEGAL_AUDIT", purged: false, rationale: "Canonical subscription + event order metadata." },
  { table: "pending_gifts", classification: "INDEFINITE_BY_DESIGN", purged: false, rationale: "Until claimed or account deleted." },
  { table: "support_tickets", classification: "PRODUCT_HISTORY", purged: false, rationale: "Support history retained until account deletion." },
  { table: "analytics_pending_confirmations", classification: "OPERATIONAL_SHORT_LIVED", retainDays: 30, purged: false, rationale: "Short-lived confirmations; resolved rows stay until account deletion for now." },
  { table: "team_meeting_weeks", classification: "INDEFINITE_BY_DESIGN", purged: false, rationale: "Weekly lock keys; small." },
  { table: "tier_limits", classification: "INDEFINITE_BY_DESIGN", purged: false, rationale: "Catalog." },
  { table: "coaches", classification: "INDEFINITE_BY_DESIGN", purged: false, rationale: "Catalog." },
  { table: "market_items", classification: "INDEFINITE_BY_DESIGN", purged: false, rationale: "Catalog." },
  { table: "admin_audit_log", classification: "NEEDS_POLICY", purged: false, rationale: "Automated TTL disabled pending versioned KVKK/GDPR legal/privacy approval." },
  { table: "ai_usage_ledger", classification: "OPERATIONAL_SHORT_LIVED", retainMonths: RETENTION.aiUsageLedgerMonths, purged: true, rationale: "Cost/usage telemetry." },
  { table: "ai_daily_usage", classification: "OPERATIONAL_SHORT_LIVED", retainDays: 90, purged: false, rationale: "UTC-day AI token counters; rebuilt from ledger." },
  { table: "ai_platform_daily_usage", classification: "OPERATIONAL_SHORT_LIVED", retainDays: 90, purged: false, rationale: "Platform AI spend counter; overwritten per day." },
  { table: "backup_verification_runs", classification: "OPERATIONAL_SHORT_LIVED", retainDays: 90, purged: false, rationale: "DR manifests; low volume." },
  { table: "billing_events", classification: "LEGAL_AUDIT", retainMonths: RETENTION.billingEventsMonths, purged: true, rationale: "Tax/accounting 7 years." },
  { table: "cost_alerts", classification: "OPERATIONAL_SHORT_LIVED", retainDays: 90, purged: false, rationale: "Ops alerts; low volume." },
  { table: "cron_job_runs", classification: "OPERATIONAL_SHORT_LIVED", retainDays: 90, purged: false, rationale: "Cron metrics; low volume." },
  { table: "domain_events", classification: "OPERATIONAL_SHORT_LIVED", retainDays: RETENTION.domainEventsDays, purged: true, rationale: "Processed outbox only." },
  { table: "product_events", classification: "NEEDS_POLICY", purged: false, rationale: "Product analytics TTL pending legal/privacy approval (ADR 008). Production collection off by default." },
  { table: "scan_corrections", classification: "PRODUCT_HISTORY", retainMonths: RETENTION.analyticsMonths, purged: false, rationale: "Numeric scan corrections; no image or free-text." },
  { table: "idempotency_keys", classification: "OPERATIONAL_SHORT_LIVED", purged: true, rationale: "TTL via expires_at." },
  { table: "influencer_codes", classification: "INDEFINITE_BY_DESIGN", purged: false, rationale: "Admin catalog." },
  { table: "leaderboard_snapshots", classification: "OPERATIONAL_SHORT_LIVED", purged: false, rationale: "Overwritten in place." },
  { table: "retention_purge_runs", classification: "OPERATIONAL_SHORT_LIVED", retainDays: 365, purged: false, rationale: "Purge audit." },
  { table: "support_messages", classification: "PRODUCT_HISTORY", purged: false, rationale: "Tied to tickets; account deletion cascades." },
];

export function retentionTableNames(): string[] {
  return RETENTION_REGISTRY.map((e) => e.table).sort();
}
