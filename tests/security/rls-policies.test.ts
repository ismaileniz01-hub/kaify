import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

function readAllMigrations(): string {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf8"))
    .join("\n");
}

describe("rls-policies (static migration checks)", () => {
  const sql = readAllMigrations();

  it("chat_messages INSERT is not granted to authenticated", () => {
    expect(sql).toMatch(/revoke insert on public\.chat_messages from authenticated/i);
  });

  it("perform_daily_check_in latest grant targets service_role only", () => {
    const grants = [
      ...sql.matchAll(
        /grant execute on function public\.perform_daily_check_in\([^)]*\) to (\w+)/gi,
      ),
    ];
    expect(grants.length).toBeGreaterThan(0);
    const last = grants[grants.length - 1];
    expect(last?.[1]).toBe("service_role");
  });

  it("admin_get_overview_stats is service_role only in latest grants", () => {
    const faz2Idx = sql.lastIndexOf("Faz 2 security hardening");
    const tail = faz2Idx >= 0 ? sql.slice(faz2Idx) : sql;
    expect(tail).toMatch(
      /grant execute on function public\.admin_get_overview_stats\(\) to service_role/i,
    );
    expect(tail).not.toMatch(
      /grant execute on function public\.admin_get_overview_stats\(\) to authenticated/i,
    );
  });

  it("influencer_codes wallet_balance is not selectable by authenticated", () => {
    const faz2Idx = sql.lastIndexOf("Faz 2 security hardening");
    const tail = faz2Idx >= 0 ? sql.slice(faz2Idx) : sql;
    expect(tail).toMatch(/revoke select on public\.influencer_codes from authenticated/i);
  });
});
