import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

/** Service-only economy/admin RPCs — latest lockdown must revoke anon. */
const SERVICE_ONLY = [
  "admin_create_pending_gift",
  "grant_freezie",
  "apply_daily_chest_reward",
  "record_cron_run",
  "set_active_aura",
  "spend_gems",
  "earn_gems",
  "claim_pending_streak_rewards",
] as const;

function readAllMigrations(): string {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf8"))
    .join("\n");
}

describe("rpc privilege matrix (static)", () => {
  const sql = readAllMigrations();
  const faz0 = readFileSync(
    join(MIGRATIONS_DIR, "20260804160000_faz0_rpc_privilege_lockdown.sql"),
    "utf8",
  );

  it("includes Faz 0 lockdown migration", () => {
    expect(faz0.length).toBeGreaterThan(1000);
    expect(faz0).toContain("require_service_role");
  });

  it("locks each service-only RPC name in Faz 0", () => {
    for (const name of SERVICE_ONLY) {
      expect(faz0).toContain(name);
    }
  });

  it("revokes anon from service-only RPCs in Faz 0 loop", () => {
    expect(faz0).toContain(
      "revoke all on function public.%s from public, anon, authenticated",
    );
    expect(faz0).toContain("grant execute on function public.%s to service_role");
  });

  it("keeps claim_pending_gift authenticated (not anon)", () => {
    expect(faz0).toContain("claim_pending_gift(uuid)");
    expect(faz0).toMatch(
      /revoke all on function public\.%s from public, anon/i,
    );
  });

  it("preserves public leaderboard reads", () => {
    expect(faz0).toMatch(
      /grant execute on function public\.get_global_leaderboard\(integer, integer\)[\s\S]*to anon, authenticated, service_role/i,
    );
  });

  it("full migration history still contains perform_daily_check_in service_role grant", () => {
    expect(sql).toMatch(
      /grant execute on function public\.perform_daily_check_in\([^)]*\) to service_role/i,
    );
  });
});
