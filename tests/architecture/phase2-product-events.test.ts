import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("F2 product_events migration", () => {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/20260826140000_phase2_product_lifecycle.sql"),
    "utf8",
  );

  it("keeps writes service-role-only and skips production TTL", () => {
    expect(sql).toContain("create table if not exists public.product_events");
    expect(sql).toContain("revoke all on table public.product_events from public, anon, authenticated");
    expect(sql).toContain("grant select, insert, update, delete on table public.product_events to service_role");
    expect(sql).not.toMatch(/perform cron\.|create extension if not exists pg_cron/i);
    expect(sql).toContain("scan_corrections");
    expect(sql).toContain("last_meaningful_activity_at");
    expect(sql).toContain("quiet_hours_start");
  });
});
