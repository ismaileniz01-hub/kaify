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
  runSqlText,
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

  it("AI aggregate stays one row after many ledger inserts (O(1) hot path)", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const rows = Array.from({ length: 24 }, (_, i) => ({
      user_id: userA.user.id,
      provider: "deepseek",
      operation: "chat",
      prompt_tokens: 1,
      completion_tokens: 1,
      total_tokens: 2,
      estimated_usd_micro: 1 + i,
    }));
    const { error } = await admin.from("ai_usage_ledger").insert(rows);
    expect(error).toBeNull();

    const agg = runSqlJson<{ n: number; total_tokens: number }>(
      `select count(*)::int as n, coalesce(sum(total_tokens),0) as total_tokens
       from public.ai_daily_usage
       where user_id = '${userA.user.id}' and usage_date = '${today}'`,
    );
    expect(Number(agg[0]?.n)).toBe(1);

    const ledger = runSqlJson<{ s: number }>(
      `select coalesce(sum(total_tokens),0) as s from public.ai_usage_ledger
       where user_id = '${userA.user.id}'
         and (timezone('UTC', created_at))::date = '${today}'`,
    );
    expect(Number(agg[0]?.total_tokens)).toBe(Number(ledger[0]?.s));
  });

  it("yesterday ledger does not increment today's aggregate (day boundary)", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const before = runSqlJson<{ total_tokens: number }>(
      `select coalesce(sum(total_tokens),0) as total_tokens from public.ai_daily_usage
       where user_id = '${userA.user.id}' and usage_date = '${today}'`,
    );
    runSqlText(`
      insert into public.ai_usage_ledger (
        user_id, provider, operation, prompt_tokens, completion_tokens,
        total_tokens, estimated_usd_micro, created_at
      ) values (
        '${userA.user.id}', 'deepseek', 'chat', 3, 3, 6, 1,
        ((timezone('UTC', now()))::date - 1)::timestamp at time zone 'UTC'
      )
    `);
    const after = runSqlJson<{ total_tokens: number }>(
      `select coalesce(sum(total_tokens),0) as total_tokens from public.ai_daily_usage
       where user_id = '${userA.user.id}' and usage_date = '${today}'`,
    );
    expect(Number(after[0]?.total_tokens)).toBe(Number(before[0]?.total_tokens));
  });

  it("leaderboard page query uses the qualifying index and Limit", () => {
    const idx = runSqlJson<{ indexname: string }>(
      `select indexname from pg_indexes
       where schemaname = 'public'
         and indexname = 'idx_user_streaks_leaderboard_qualifying'`,
    );
    expect(idx[0]?.indexname).toBe("idx_user_streaks_leaderboard_qualifying");

    const def = runSqlJson<{ def: string }>(
      `select pg_get_functiondef('public.get_global_leaderboard(integer,integer)'::regprocedure) as def`,
    );
    const body = def[0]?.def ?? "";
    expect(body).toMatch(/with page as/i);
    expect(body).toMatch(/limit greatest/i);
    expect(body).not.toMatch(/rank\(\)\s+over/i);

    const plan = runSqlText(`
      BEGIN;
      SET LOCAL enable_seqscan = off;
      EXPLAIN (FORMAT TEXT)
      SELECT s.current_streak, s.longest_streak
      FROM public.user_streaks s
      WHERE s.current_streak > 0
      ORDER BY s.current_streak DESC, s.longest_streak DESC
      LIMIT 50;
      ROLLBACK;
    `);
    expect(plan).toMatch(/idx_user_streaks_leaderboard_qualifying/i);
    expect(plan).toMatch(/Limit/i);
    expect(plan).not.toMatch(/WindowAgg/i);
  });
});
