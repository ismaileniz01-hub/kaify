/**
 * Live SECURITY DEFINER RPC authorization tests.
 * Skipped unless KAIFY_DB_TESTS=1.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  AUDIT_SECURITY_DEFINER_COUNT,
  RPC_REGISTRY,
  rpcByMode,
  rpcNames,
} from "./rpc-registry";
import {
  assertAllowed,
  assertDenied,
  cleanupTestUsers,
  createAnonClient,
  createServiceClient,
  createTestUser,
  dbTestsEnabled,
  listSecurityDefinerFunctions,
  type TestUser,
} from "./setup";
import type { SupabaseClient } from "@supabase/supabase-js";

const enabled = dbTestsEnabled();

describe.skipIf(!enabled)("rpc-authorization (live)", () => {
  let admin: SupabaseClient;
  let userA: TestUser;
  let userB: TestUser;

  beforeAll(async () => {
    admin = createServiceClient();
    userA = await createTestUser("USER_A", admin);
    userB = await createTestUser("USER_B", admin);
  }, 120_000);

  afterAll(async () => {
    await cleanupTestUsers([userA, userB]);
  }, 60_000);

  it("registry covers every SECURITY DEFINER function (completeness)", () => {
    const live = listSecurityDefinerFunctions()
      .filter((n) => !n.startsWith("__kaify_"))
      .sort();
    const registered = rpcNames();
    const missing = live.filter((n) => !registered.includes(n));
    const extra = registered.filter((n) => !live.includes(n));
    expect(
      missing,
      `Unregistered SECURITY DEFINER functions:\n${missing.join("\n")}`,
    ).toEqual([]);
    expect(
      extra,
      `Registry RPCs missing from DB:\n${extra.join("\n")}`,
    ).toEqual([]);
  });

  it(`re-measures SECURITY DEFINER count vs audit baseline (${AUDIT_SECURITY_DEFINER_COUNT})`, () => {
    const live = listSecurityDefinerFunctions().filter(
      (n) => !n.startsWith("__kaify_"),
    );
    const count = live.length;
    console.log(
      `SECURITY DEFINER count: live=${count} audit_baseline=${AUDIT_SECURITY_DEFINER_COUNT} delta=${count - AUDIT_SECURITY_DEFINER_COUNT} registry=${RPC_REGISTRY.length}`,
    );
    expect(count).toBeGreaterThan(0);
    // Completeness test already enforces name parity; keep a soft drift band vs audit.
    expect(Math.abs(count - AUDIT_SECURITY_DEFINER_COUNT)).toBeLessThanOrEqual(10);
    expect(RPC_REGISTRY.length).toBe(count);
  });

  describe("service_only RPCs", () => {
    for (const entry of rpcByMode("service_only")) {
      it(`${entry.name}: authenticated EXECUTE fails`, async () => {
        const { data, error } = await userA.client.rpc(entry.name as never);
        const ok = !error;
        assertDenied({
          table: entry.name,
          op: "rpc",
          actor: "USER_A",
          ok,
          detail: data == null ? undefined : `data=${JSON.stringify(data).slice(0, 200)}`,
          error: error?.message ?? null,
        });
      });
    }
  });

  describe("client_callable RPCs", () => {
    it("get_user_rank requires auth (anon denied or empty privilege)", async () => {
      const anon = createAnonClient();
      const { data, error } = await anon.rpc("get_user_rank");
      assertDenied({
        table: "get_user_rank",
        op: "rpc",
        actor: "anon",
        ok: !error,
        detail: data == null ? undefined : `data=${JSON.stringify(data).slice(0, 200)}`,
        error: error?.message ?? null,
      });
    });

    it("get_user_rank succeeds for authenticated USER_A", async () => {
      const { data, error } = await userA.client.rpc("get_user_rank");
      assertAllowed({
        table: "get_user_rank",
        op: "rpc",
        actor: "USER_A",
        owner: userA.user.id,
        ok: !error,
        detail: data == null ? undefined : `data=${JSON.stringify(data).slice(0, 200)}`,
        error: error?.message ?? null,
      });
    });

    it("is_admin returns boolean for authenticated user", async () => {
      const { data, error } = await userA.client.rpc("is_admin");
      assertAllowed({
        table: "is_admin",
        op: "rpc",
        actor: "USER_A",
        ok: !error && typeof data === "boolean",
        detail: `data=${String(data)}`,
        error: error?.message ?? null,
      });
      expect(data).toBe(false);
    });

    it("get_usage_status requires auth and returns for USER_A", async () => {
      const anon = createAnonClient();
      const anonCall = await anon.rpc("get_usage_status");
      assertDenied({
        table: "get_usage_status",
        op: "rpc",
        actor: "anon",
        ok: !anonCall.error,
        error: anonCall.error?.message ?? null,
      });

      const authCall = await userA.client.rpc("get_usage_status");
      assertAllowed({
        table: "get_usage_status",
        op: "rpc",
        actor: "USER_A",
        ok: !authCall.error,
        error: authCall.error?.message ?? null,
      });
    });

    it("perform_daily_check_in is not client-callable (service_only privilege)", async () => {
      const { error } = await userA.client.rpc("perform_daily_check_in", {
        p_request_key: `forge-${Date.now()}`,
        p_user_id: userB.user.id,
      });
      assertDenied({
        table: "perform_daily_check_in",
        op: "rpc",
        actor: "USER_A",
        owner: userB.user.id,
        ok: !error,
        detail: "cross-user forge must not execute",
        error: error?.message ?? null,
      });
    });

    it("earn_gems cannot be forged by authenticated for another user", async () => {
      const { error } = await userA.client.rpc("earn_gems", {
        p_user_id: userB.user.id,
        p_amount: 99999,
        p_type: "welcome_bonus",
        p_description: "forge",
        p_idempotency_key: `forge-${Date.now()}`,
        p_metadata: {},
      });
      assertDenied({
        table: "earn_gems",
        op: "rpc",
        actor: "USER_A",
        owner: userB.user.id,
        ok: !error,
        error: error?.message ?? null,
      });
    });

    it("leaderboard RPCs are callable (anon or authenticated)", async () => {
      const anon = createAnonClient();
      const g = await anon.rpc("get_global_leaderboard", { p_limit: 5, p_offset: 0 });
      assertAllowed({
        table: "get_global_leaderboard",
        op: "rpc",
        actor: "anon",
        ok: !g.error,
        error: g.error?.message ?? null,
      });
      const c = await userA.client.rpc("get_country_leaderboard", { p_limit: 5 });
      assertAllowed({
        table: "get_country_leaderboard",
        op: "rpc",
        actor: "USER_A",
        ok: !c.error,
        error: c.error?.message ?? null,
      });
    });
  });

  it("trigger_only / internal entries are classified", () => {
    expect(rpcByMode("trigger_only").length).toBeGreaterThan(0);
    expect(rpcByMode("internal").length).toBeGreaterThan(0);
  });
});
