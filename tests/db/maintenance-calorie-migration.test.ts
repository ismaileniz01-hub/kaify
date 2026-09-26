import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260824160000_maintenance_calorie_goal.sql",
  ),
  "utf8",
);

describe("maintenance calorie persistence migration", () => {
  it("adds a nullable constrained field without an unsafe backfill", () => {
    expect(migration).toMatch(
      /add column if not exists maintenance_calorie_goal integer/i,
    );
    expect(migration).toMatch(
      /maintenance_calorie_goal is null[\s\S]*between 800 and 6000/i,
    );
    expect(migration).not.toMatch(
      /update\s+public\.analytics_daily\s+set\s+maintenance_calorie_goal/i,
    );
  });

  it("stores maintenance atomically without replacing a manual calorie goal", () => {
    expect(migration).toMatch(
      /insert into public\.analytics_daily[\s\S]*maintenance_calorie_goal[\s\S]*p_maintenance_calorie_goal/i,
    );
    expect(migration).toMatch(
      /calorie_goal\s*=\s*public\.analytics_daily\.calorie_goal/i,
    );
    expect(migration).toMatch(/equipment_access\s*=\s*p_equipment_access/i);
    expect(migration).toMatch(/workouts_target\s*=\s*excluded\.workouts_target/i);
  });

  it("keeps both rolling signatures explicitly locked down", () => {
    expect(migration.match(/revoke all on function public\.complete_onboarding/gi))
      .toHaveLength(2);
    expect(
      migration.match(/grant execute on function public\.complete_onboarding/gi),
    ).toHaveLength(2);
    expect(migration).toMatch(/p_maintenance_calorie_goal\s+integer/i);
    expect(migration).toMatch(
      /p_maintenance_calorie_goal\s*=>\s*null/i,
    );
  });
});
