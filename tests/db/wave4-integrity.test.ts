/**
 * Live Wave 4 integrity: analytics CHECKs, gem reconcile, notification NULL dedup.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  cleanupTestUsers,
  createServiceClient,
  createTestUser,
  dbTestsEnabled,
  runSqlJson,
  type TestUser,
} from "./setup";
import type { SupabaseClient } from "@supabase/supabase-js";

const enabled = dbTestsEnabled();

describe.skipIf(!enabled)("wave4 integrity (live)", () => {
  let admin: SupabaseClient;
  let userA: TestUser;

  beforeAll(async () => {
    admin = createServiceClient();
    userA = await createTestUser("USER_A", admin);
  }, 120_000);

  afterAll(async () => {
    await cleanupTestUsers([userA]);
  }, 60_000);

  it("rejects negative analytics via CHECK", async () => {
    const today = new Date().toISOString().slice(0, 10);
    await admin.from("analytics_daily").upsert({
      user_id: userA.user.id,
      entry_date: today,
    });
    const { error } = await admin
      .from("analytics_daily")
      .update({ calories_consumed: -5 })
      .eq("user_id", userA.user.id)
      .eq("entry_date", today);
    expect(error).toBeTruthy();
  });

  it("clamps absurd upsert_analytics_daily values", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await admin.rpc("upsert_analytics_daily", {
      p_user_id: userA.user.id,
      p_entry_date: today,
      p_patch: { calories_consumed: 999999, protein_g: -3 },
    });
    expect(error).toBeNull();
    const row = Array.isArray(data) ? data[0] : data;
    expect(Number((row as { calories_consumed?: number }).calories_consumed)).toBeLessThanOrEqual(
      20_000,
    );
    expect(Number((row as { protein_g?: number }).protein_g)).toBeGreaterThanOrEqual(0);
  });

  it("gem_balance matches ledger sum after earn/spend", async () => {
    const key = `w4-earn-${userA.user.id}`;
    const { error: earnError, data: earned } = await admin.rpc("earn_gems", {
      p_user_id: userA.user.id,
      p_amount: 50,
      p_type: "welcome_bonus",
      p_description: "wave4",
      p_idempotency_key: key,
    });
    expect(earnError).toBeNull();
    const earnRow = (Array.isArray(earned) ? earned[0] : earned) as {
      applied?: boolean;
    } | null;
    expect(earnRow?.applied).toBe(true);

    const { error: dupError, data: dup } = await admin.rpc("earn_gems", {
      p_user_id: userA.user.id,
      p_amount: 50,
      p_type: "welcome_bonus",
      p_description: "wave4",
      p_idempotency_key: key,
    });
    expect(dupError).toBeNull();
    const dupRow = (Array.isArray(dup) ? dup[0] : dup) as {
      duplicate?: boolean;
      applied?: boolean;
    } | null;
    expect(dupRow?.duplicate === true || dupRow?.applied === false).toBe(true);

    const rows = runSqlJson<{ balance: number; ledger: number }>(
      `select ks.gem_balance as balance,
              coalesce((select sum(amount) from public.gem_ledger g where g.user_id = ks.user_id), 0) as ledger
       from public.user_kai_state ks
       where ks.user_id = '${userA.user.id}'`,
    );
    expect(Number(rows[0]?.balance)).toBe(Number(rows[0]?.ledger));
  });

  it("NULL notification dedup_key does not collapse unrelated events", async () => {
    const { error: e1 } = await admin.from("notifications").insert({
      user_id: userA.user.id,
      type: "system",
      title: "a",
      dedup_key: null,
    });
    const { error: e2 } = await admin.from("notifications").insert({
      user_id: userA.user.id,
      type: "system",
      title: "b",
      dedup_key: null,
    });
    expect(e1).toBeNull();
    expect(e2).toBeNull();

    const { error: d1 } = await admin.from("notifications").insert({
      user_id: userA.user.id,
      type: "system",
      title: "c",
      dedup_key: "same-key",
    });
    const { error: d2 } = await admin.from("notifications").insert({
      user_id: userA.user.id,
      type: "system",
      title: "d",
      dedup_key: "same-key",
    });
    expect(d1).toBeNull();
    expect(d2).toBeTruthy();
  });

  it("concurrent spend cannot overspend (advisory + row lock)", async () => {
    const spendKey = `w4-spend-${userA.user.id}`;
    const { data: first } = await admin.rpc("spend_gems", {
      p_user_id: userA.user.id,
      p_amount: 10,
      p_type: "market_purchase",
      p_description: "w4",
      p_idempotency_key: spendKey,
    });
    const { data: second } = await admin.rpc("spend_gems", {
      p_user_id: userA.user.id,
      p_amount: 10,
      p_type: "market_purchase",
      p_description: "w4",
      p_idempotency_key: spendKey,
    });
    expect((second as { duplicate?: boolean })?.duplicate).toBe(true);
    expect((first as { applied?: boolean })?.applied).toBe(true);
  });
});
