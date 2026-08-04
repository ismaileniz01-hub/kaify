import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
const FAZ0 = "20260804160000_faz0_rpc_privilege_lockdown.sql";

/** Economy / admin mutators that must never be PostgREST-callable by anon. */
const SERVICE_ROLE_ONLY = [
  "admin_create_pending_gift",
  "grant_freezie",
  "apply_daily_chest_reward",
  "record_cron_run",
  "set_active_aura",
  "claim_pending_streak_rewards",
  "claim_streak_gem_rewards",
  "spend_gems",
  "earn_gems",
  "require_service_role",
] as const;

const AUTHENTICATED_NOT_ANON = [
  "claim_pending_gift",
  "complete_onboarding",
] as const;

function readMigration(name: string): string {
  return readFileSync(join(MIGRATIONS_DIR, name), "utf8");
}

function latestMigrationMatching(substr: string): string {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const hit = files.filter((f) => f.includes(substr));
  expect(hit.length).toBeGreaterThan(0);
  return hit[hit.length - 1]!;
}

describe("faz0 rpc privilege lockdown", () => {
  it("ships as a migration file", () => {
    expect(readdirSync(MIGRATIONS_DIR)).toContain(FAZ0);
  });

  it("revokes service-only RPCs from anon and authenticated", () => {
    const sql = readMigration(FAZ0);
    for (const name of SERVICE_ROLE_ONLY) {
      expect(sql).toContain(name);
    }
    expect(sql).toMatch(
      /revoke all on function public\.%s from public, anon, authenticated/i,
    );
    expect(sql).toContain(
      "revoke all on function public.%s from public, anon, authenticated",
    );
    expect(sql).toContain("grant execute on function public.%s to service_role");
  });

  it("adds JWT service_role guards on mint/admin mutators", () => {
    const sql = readMigration(FAZ0);
    expect(sql).toContain("perform public.require_service_role()");
    expect(sql).toMatch(
      /create or replace function public\.admin_create_pending_gift/i,
    );
    expect(sql).toMatch(
      /create or replace function public\.apply_daily_chest_reward/i,
    );
    expect(sql).toMatch(/create or replace function public\.record_cron_run/i);
    expect(sql).toMatch(/create or replace function public\.set_active_aura/i);
  });

  it("does not put service_role JWT guard on grant_freezie (nested claim path)", () => {
    const sql = readMigration(FAZ0);
    const grantFn = sql.slice(
      sql.indexOf("create or replace function public.grant_freezie"),
      sql.indexOf("create or replace function public.admin_get_cache_hit_stats"),
    );
    expect(grantFn).toContain("grant_freezie");
    expect(grantFn).not.toContain("require_service_role");
  });

  it("revokes anon from authenticated-only user RPCs", () => {
    const sql = readMigration(FAZ0);
    for (const name of AUTHENTICATED_NOT_ANON) {
      expect(sql).toContain(name);
    }
    expect(sql).toContain(
      "revoke all on function public.%s from public, anon",
    );
  });

  it("locks default privileges for future functions", () => {
    const sql = readMigration(FAZ0);
    expect(sql).toMatch(
      /alter default privileges[\s\S]*revoke execute on functions from public/i,
    );
    expect(sql).toMatch(
      /alter default privileges[\s\S]*revoke execute on functions from anon/i,
    );
  });

  it("is the latest lockdown migration for these RPCs", () => {
    expect(latestMigrationMatching("faz0_rpc_privilege_lockdown")).toBe(FAZ0);
  });
});
