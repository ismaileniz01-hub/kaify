import { describe, expect, it } from "vitest";
import { USER_EXPORT_TABLES, exportSchemaReadme } from "@/lib/compliance/export-tables";

/** Tables that must appear in GDPR export — update when adding user-owned tables. */
const REQUIRED_EXPORT_TABLES = [
  "gem_ledger",
  "user_streaks",
  "user_kai_state",
  "user_usage_counters",
  "usage_events",
  "chat_messages",
  "user_coaching_state",
  "coaching_memory",
  "analytics_daily",
  "health_steps",
  "user_market_inventory",
  "user_settings",
  "referral_events",
  "consent_records",
  "consent_revocations",
  "notifications",
  "push_subscriptions",
  "native_push_tokens",
  "daily_chest_claims",
  "idempotency_keys",
  "ai_usage_ledger",
  "billing_events",
  "data_export_logs",
] as const;

describe("export completeness", () => {
  it("includes every required user-owned table", () => {
    const exported = USER_EXPORT_TABLES.map((t) => t.table);
    for (const table of REQUIRED_EXPORT_TABLES) {
      expect(exported, `missing export table: ${table}`).toContain(table);
    }
  });

  it("has no duplicate table entries", () => {
    const names = USER_EXPORT_TABLES.map((t) => t.table);
    expect(new Set(names).size).toBe(names.length);
  });

  it("provides a readme description for every exported table", () => {
    const readme = exportSchemaReadme();
    for (const { table } of USER_EXPORT_TABLES) {
      expect(readme[table]?.length, `missing readme for ${table}`).toBeGreaterThan(0);
    }
  });
});
