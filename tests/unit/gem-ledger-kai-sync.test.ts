import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20260822120000_sync_kai_gems_from_ledger.sql",
);

describe("kai gem balance stays in lockstep with ledger", () => {
  const sql = readFileSync(MIGRATION, "utf8");

  it("syncs kai_state from gem_ledger inserts via trigger", () => {
    expect(sql).toContain("trg_sync_kai_gems_from_ledger");
    expect(sql).toMatch(/after insert on public\.gem_ledger/i);
    expect(sql).toContain("gem_balance = gem_balance + NEW.amount");
  });

  it("does not double-count earn/spend on top of the trigger", () => {
    expect(sql).not.toMatch(/gem_balance = gem_balance \+ p_amount/);
    expect(sql).not.toMatch(/gem_balance = gem_balance - p_amount/);
  });

  it("returns streak and chest balances from user_kai_state", () => {
    expect(sql).toContain("claim_pending_streak_rewards");
    expect(sql).toContain("apply_daily_chest_reward");
    expect(sql).toContain("perform public.require_service_role()");
    expect(sql).toMatch(/from public\.user_kai_state where user_id = p_user_id/);
    expect(sql).not.toMatch(
      /select coalesce\(sum\(amount\), 0\) into v_balance\s+from public\.gem_ledger/,
    );
  });

  it("repairs existing kai_state drift from the ledger", () => {
    expect(sql).toMatch(/update public\.user_kai_state ks/i);
    expect(sql).toContain("from public.gem_ledger");
  });
});
