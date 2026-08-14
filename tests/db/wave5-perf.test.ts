/**
 * Live Wave 5: AI daily aggregate vs ledger; leaderboard page uses bounded SQL.
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

describe.skipIf(!enabled)("wave5 performance integrity (live)", () => {
  let admin: SupabaseClient;
  let userA: TestUser;

  beforeAll(async () => {
    admin = createServiceClient();
    userA = await createTestUser("USER_A", admin);
  }, 120_000);

  afterAll(async () => {
    await cleanupTestUsers([userA]);
  }, 60_000);

  it("ledger insert maintains ai_daily_usage and reconcile matches", async () => {
    const { error: insError } = await admin.from("ai_usage_ledger").insert({
      user_id: userA.user.id,
      provider: "deepseek",
      operation: "chat",
      prompt_tokens: 10,
      completion_tokens: 5,
      total_tokens: 15,
      estimated_usd_micro: 100,
    });
    expect(insError).toBeNull();

    const today = new Date().toISOString().slice(0, 10);
    const rows = runSqlJson<{ total_tokens: number }>(
      `select total_tokens from public.ai_daily_usage
       where user_id = '${userA.user.id}' and usage_date = '${today}'`,
    );
    expect(Number(rows[0]?.total_tokens)).toBeGreaterThanOrEqual(15);

    const { error: recError, data } = await admin.rpc("reconcile_ai_daily_usage", {
      p_day: today,
    });
    expect(recError).toBeNull();
    expect(data).toBeTruthy();

    const after = runSqlJson<{ total_tokens: number }>(
      `select total_tokens from public.ai_daily_usage
       where user_id = '${userA.user.id}' and usage_date = '${today}'`,
    );
    const ledger = runSqlJson<{ s: number }>(
      `select coalesce(sum(total_tokens),0) as s from public.ai_usage_ledger
       where user_id = '${userA.user.id}'
         and (timezone('UTC', created_at))::date = '${today}'`,
    );
    expect(Number(after[0]?.total_tokens)).toBe(Number(ledger[0]?.s));
  });

  it("get_global_leaderboard stays callable for service_role and returns a page", async () => {
    const { data, error } = await admin.rpc("get_global_leaderboard", {
      p_limit: 5,
      p_offset: 0,
    });
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});
