import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SCHEMA_REGISTRY } from "../db/schema-registry";
import { AUDIT_SECURITY_DEFINER_COUNT, RPC_REGISTRY } from "../db/rpc-registry";

describe("SEC-005 runtime authorization gates remain active", () => {
  it("CI still runs the live DB RLS/RPC suite", () => {
    const ci = readFileSync(join(process.cwd(), ".github/workflows/ci.yml"), "utf8");
    expect(ci).toContain("npm run test:db");
    expect(ci).toContain("supabase db reset --local --yes");
  });

  it("registries still require complete classification", () => {
    expect(SCHEMA_REGISTRY).toHaveLength(44);
    expect(RPC_REGISTRY).toHaveLength(AUDIT_SECURITY_DEFINER_COUNT);
    expect(AUDIT_SECURITY_DEFINER_COUNT).toBe(39);
  });

  it("live suite files still encode USER_A / USER_B denial", () => {
    const rls = readFileSync(join(process.cwd(), "tests/db/rls-authorization.test.ts"), "utf8");
    const rpc = readFileSync(join(process.cwd(), "tests/db/rpc-authorization.test.ts"), "utf8");
    expect(rls).toContain("USER_A");
    expect(rls).toContain("USER_B");
    expect(rls).toContain("registry covers every public base table");
    expect(rpc).toContain("registry covers every SECURITY DEFINER function");
  });
});

describe("Wave 2 grants are not an RLS substitute", () => {
  it("user_settings / support_tickets / analytics_pending still have owner RLS", () => {
    const grants = readFileSync(
      join(process.cwd(), "supabase/migrations/20260812190000_wave2_service_and_settings_grants.sql"),
      "utf8",
    );
    expect(grants).toMatch(/grant select, insert, update, delete on table public\.user_settings to authenticated/i);
    expect(grants).toMatch(/grant select, insert, update, delete on table public\.support_tickets to authenticated/i);
    expect(grants).toMatch(/grant select on table public\.analytics_pending_confirmations to authenticated/i);

    const settings = readFileSync(
      join(process.cwd(), "supabase/migrations/20260702230000_perf_rls_indexes.sql"),
      "utf8",
    );
    expect(settings).toContain("user_settings_all_own");
    expect(settings).toMatch(/user_id = \(select auth\.uid\(\)\)/);
  });
});

describe("FORCE ROW LEVEL SECURITY (SEC-007)", () => {
  it("does not blindly FORCE RLS across every table", () => {
    const wave3 = readFileSync(
      join(process.cwd(), "supabase/migrations/20260814120000_wave3_security_privacy.sql"),
      "utf8",
    );
    expect(wave3).not.toMatch(/force row level security/i);
  });

  it("classifies every public table into a FORCE-RLS decision category", () => {
    for (const entry of SCHEMA_REGISTRY) {
      expect(["user_own", "authenticated_read", "service_only", "skip_reason"]).toContain(
        entry.mode,
      );
    }
  });
});
