/**
 * Migration reproducibility checks.
 * - Static asserts always run (no DB required).
 * - Live schema existence asserts run only when KAIFY_DB_TESTS=1.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { dbTestsEnabled, listPublicBaseTables, listSecurityDefinerFunctions, runSqlJson } from "./setup";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
const BRIDGE = "20260703140000_schema_bridge_profiles.sql";
const LEADERBOARD = "20260704190000_leaderboard_privacy_and_cron_monitor.sql";

function readMigration(name: string): string {
  return readFileSync(join(MIGRATIONS_DIR, name), "utf8");
}

function stripSqlComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--[^\n]*/g, "");
}

/**
 * Find top-level (outside DO $$ ... $$) occurrences of a pattern.
 * Used to ensure legacy column refs are not parse-time-validated outside
 * dynamic SQL / information_schema-guarded blocks.
 */
function topLevelOutsideDoBlocks(sql: string): string {
  const cleaned = stripSqlComments(sql);
  // Remove DO $$ ... $$ / DO $tag$ ... $tag$ blocks (including nested dollar quotes of same tag).
  return cleaned.replace(/do\s+\$[a-zA-Z_]*\$[\s\S]*?\$[a-zA-Z_]*\$\s*;/gi, "");
}

describe("migration-reproducibility (static)", () => {
  it("schema_bridge migration exists", () => {
    expect(readdirSync(MIGRATIONS_DIR)).toContain(BRIDGE);
  });

  it("schema_bridge uses information_schema guards", () => {
    const sql = readMigration(BRIDGE);
    expect(sql).toMatch(/information_schema\.columns/i);
    expect(sql).toMatch(/has_full_name/i);
    expect(sql).toMatch(/has_subscription_tier/i);
  });

  it("schema_bridge has no unguarded top-level trim(full_name)", () => {
    const top = topLevelOutsideDoBlocks(readMigration(BRIDGE));
    expect(top).not.toMatch(/trim\s*\(\s*full_name\s*\)/i);
  });

  it("schema_bridge has no unguarded top-level subscription_tier column update", () => {
    const top = topLevelOutsideDoBlocks(readMigration(BRIDGE));
    // Bare SET ... subscription_tier ... outside DO blocks is forbidden.
    // Type name public.subscription_tier in ADD COLUMN is OK — exclude those.
    const withoutTypeRefs = top.replace(/public\.subscription_tier/gi, "");
    expect(withoutTypeRefs).not.toMatch(
      /\bupdate\s+public\.profiles[\s\S]{0,400}\bsubscription_tier\b/i,
    );
  });

  it("leaderboard migration does not reference p.full_name", () => {
    const sql = readMigration(LEADERBOARD);
    expect(sql).not.toMatch(/p\.full_name/i);
    expect(readdirSync(MIGRATIONS_DIR)).toContain(LEADERBOARD);
  });

  it("pg_cron vault schedules do not hard-fail clean databases", () => {
    const sql = readMigration("20260804171000_faz1_pg_cron_vault_schedules.sql");
    expect(sql).not.toMatch(
      /raise exception 'vault secret kaify_cron_secret missing/i,
    );
    expect(sql).toMatch(/skipping pg_cron HTTP schedules/i);
  });
});

describe.skipIf(!dbTestsEnabled())("migration-reproducibility (live after reset)", () => {
  const CRITICAL_TABLES = [
    "profiles",
    "gem_ledger",
    "user_streaks",
    "user_kai_state",
    "chat_messages",
    "notifications",
    "paddle_customers",
    "paddle_subscriptions",
    "cron_job_runs",
    "pending_gifts",
  ];

  const CRITICAL_ENUMS = [
    "subscription_tier",
    "onboarding_status",
    "gem_transaction_type",
    "usage_resource",
  ];

  const CRITICAL_FUNCTIONS = [
    "perform_daily_check_in",
    "get_user_rank",
    "get_global_leaderboard",
    "earn_gems",
    "handle_new_user",
    "require_service_role",
  ];

  it("critical tables exist", () => {
    const tables = new Set(listPublicBaseTables());
    for (const t of CRITICAL_TABLES) {
      expect(tables.has(t), `missing table public.${t}`).toBe(true);
    }
  });

  it("critical enums exist", () => {
    const rows = runSqlJson<{ typname: string }>(
      `select t.typname
       from pg_type t
       join pg_namespace n on n.oid = t.typnamespace
       where n.nspname = 'public'
         and t.typtype = 'e'
       order by t.typname;`,
    );
    const names = new Set(rows.map((r) => r.typname));
    for (const e of CRITICAL_ENUMS) {
      expect(names.has(e), `missing enum public.${e}`).toBe(true);
    }
  });

  it("critical functions exist", () => {
    const fns = new Set(listSecurityDefinerFunctions());
    // Also allow non-DEFINER critical helpers via pg_proc inventory.
    const all = runSqlJson<{ proname: string }>(
      `select p.proname
       from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public'
       order by p.proname;`,
    );
    const allNames = new Set(all.map((r) => r.proname));
    for (const f of CRITICAL_FUNCTIONS) {
      expect(
        fns.has(f) || allNames.has(f),
        `missing function public.${f}`,
      ).toBe(true);
    }
  });
});
