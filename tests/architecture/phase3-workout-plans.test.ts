import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("F3 workout plan migration", () => {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/20260826150000_phase3_workout_plans.sql"),
    "utf8",
  );

  it("creates versioned plan and session tables with RLS and no pg_cron TTL", () => {
    expect(sql).toContain("create table if not exists public.workout_plans");
    expect(sql).toContain("create table if not exists public.workout_plan_items");
    expect(sql).toContain("create table if not exists public.workout_sessions");
    expect(sql).toContain("create table if not exists public.workout_set_logs");
    expect(sql).toContain("alter table public.workout_plans enable row level security");
    expect(sql).toContain("alter table public.workout_plan_items enable row level security");
    expect(sql).toContain("alter table public.workout_sessions enable row level security");
    expect(sql).toContain("alter table public.workout_set_logs enable row level security");
    expect(sql).toContain("revoke insert, update, delete on table public.workout_plan_items");
    expect(sql).toContain("revoke insert, update, delete on table public.workout_sessions");
    expect(sql).toContain("revoke insert, update, delete on table public.workout_set_logs");
    expect(sql).not.toMatch(/perform cron\.|create extension if not exists pg_cron/i);
    expect(sql).not.toMatch(/free.?text|health_notes|coach_notes/i);
  });
});

describe("F3-06 exercise dialog a11y", () => {
  it("marks the library exercise sheet as a modal dialog", () => {
    const src = readFileSync(
      join(process.cwd(), "components/library/ExerciseDetailSheet.tsx"),
      "utf8",
    );
    expect(src).toContain('role="dialog"');
    expect(src).toContain('aria-modal="true"');
    expect(src).toContain("aria-labelledby");
  });
});

describe("F3-06 exercise dialog a11y", () => {
  it("marks the library exercise sheet as a modal dialog", () => {
    const src = readFileSync(
      join(process.cwd(), "components/library/ExerciseDetailSheet.tsx"),
      "utf8",
    );
    expect(src).toContain('role="dialog"');
    expect(src).toContain('aria-modal="true"');
    expect(src).toContain("aria-labelledby");
  });
});
