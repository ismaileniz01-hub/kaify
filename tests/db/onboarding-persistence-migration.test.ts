import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260824150000_onboarding_calorie_equipment_persistence.sql",
  ),
  "utf8",
);

describe("onboarding calorie/equipment persistence migration", () => {
  it("constrains equipment and does not backfill existing profiles", () => {
    expect(migration).toMatch(/equipment_access in \('home', 'gym', 'limited'\)/i);
    expect(migration).not.toMatch(/update\s+public\.profiles\s+set\s+equipment_access/i);
  });

  it("replaces the old RPC signature and grants only the new signature", () => {
    expect(migration).toMatch(/drop function if exists public\.complete_onboarding/i);
    expect(migration).toMatch(/p_equipment_access\s+text/i);
    expect(migration).toMatch(/p_calorie_goal\s+integer/i);
    expect(migration).toMatch(/p_workouts_target\s+integer/i);
    expect(migration).toMatch(/grant execute on function public\.complete_onboarding/i);
  });

  it("writes analytics before marking goals configured", () => {
    const analyticsWrite = migration.indexOf("insert into public.analytics_daily");
    const settingsWrite = migration.indexOf("insert into public.user_settings");
    expect(analyticsWrite).toBeGreaterThan(0);
    expect(settingsWrite).toBeGreaterThan(analyticsWrite);
    expect(migration).toMatch(/goals_configured\s*=\s*true/i);
  });
});
