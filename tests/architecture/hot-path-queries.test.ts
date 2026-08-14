import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("hot-path query shape", () => {
  it("gem balance prefers user_kai_state columns and never SUMs gem_ledger", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/services/gem-balance.service.ts"),
      "utf8",
    );
    expect(src).toContain("gem_balance");
    expect(src).not.toMatch(/from\("gem_ledger"\)/);
    expect(src).not.toMatch(/\bsum\(/i);
  });

  it("AI daily budget reads ai_daily_usage not a ledger page loop", () => {
    const src = readFileSync(join(process.cwd(), "lib/ai/daily-cost-cap.ts"), "utf8");
    expect(src).toContain("ai_daily_usage");
    expect(src).not.toContain(".range(");
    expect(src).not.toContain('.from("ai_usage_ledger")');
  });

  it("leaderboard RPC pages before ranking", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/20260814170000_wave5_performance.sql"),
      "utf8",
    );
    expect(sql).toContain("with page as");
    expect(sql).toContain("idx_user_streaks_leaderboard_qualifying");
    expect(sql).toMatch(/revoke all on function public\.get_global_leaderboard\(integer, integer\)/);
  });

  it("home GET does not scan AI budget", () => {
    const src = readFileSync(join(process.cwd(), "app/api/home/route.ts"), "utf8");
    expect(src).not.toContain("dailyAiBudget");
    expect(src).not.toContain("requireAi");
  });
});
