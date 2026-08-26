import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("confirm_analytics_pending meal+patch", () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/20260826180000_confirm_pending_meal_and_patch.sql",
    ),
    "utf8",
  );

  it("applies the water patch even when a meal is present", () => {
    expect(sql).toContain("increment_analytics_meals");
    expect(sql).toContain("upsert_analytics_daily");
    expect(sql).not.toMatch(
      /if v_meal is not null[\s\S]*else[\s\S]*v_patch := v_row\.payload -> 'patch'/,
    );
    expect(sql).toContain("v_patch := v_patch - 'caloriesConsumed'");
    expect(sql).toContain("status in ('pending', 'applying')");
  });
});
