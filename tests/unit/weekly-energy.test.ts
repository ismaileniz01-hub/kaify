import { describe, expect, it } from "vitest";
import { summarizeWeeklyEnergy } from "@/lib/analytics/weekly-energy";

describe("summarizeWeeklyEnergy", () => {
  it("shows today's resting burn and 0 kg when the week has no logs", () => {
    expect(
      summarizeWeeklyEnergy(
        [{ caloriesConsumed: 0, caloriesBurned: 0 }, { caloriesConsumed: 0 }],
        2100,
      ),
    ).toEqual({ eaten: 0, burned: 2100, kgDelta: 0 });
  });

  it("does not treat empty past days as a full-week deficit", () => {
    const week = Array.from({ length: 7 }, () => ({
      caloriesConsumed: 0,
      caloriesBurned: 0,
    }));
    expect(summarizeWeeklyEnergy(week, 2100).kgDelta).toBe(0);
    expect(summarizeWeeklyEnergy(week, 2100).eaten).toBe(0);
    expect(summarizeWeeklyEnergy(week, 2100).burned).toBe(2100);
  });

  it("counts eaten meals against resting burn plus logged workouts", () => {
    const summary = summarizeWeeklyEnergy(
      [
        { caloriesConsumed: 1800, caloriesBurned: 200 },
        { caloriesConsumed: 1800, caloriesBurned: 200 },
        { caloriesConsumed: 1800, caloriesBurned: 0 },
      ],
      2100,
    );
    expect(summary.eaten).toBe(5400);
    expect(summary.burned).toBe(2100 * 3 + 400);
    expect(summary.kgDelta).toBe(-0.2);
  });

  it("still shows resting burn on a workout-only day", () => {
    const summary = summarizeWeeklyEnergy(
      [{ caloriesConsumed: 0, caloriesBurned: 400 }],
      2100,
    );
    expect(summary.eaten).toBe(0);
    expect(summary.burned).toBe(2500);
    expect(summary.kgDelta).toBe(-0.3);
  });

  it("reflects logged intake against resting burn", () => {
    const summary = summarizeWeeklyEnergy(
      [{ caloriesConsumed: 650, caloriesBurned: 0 }],
      2100,
    );
    expect(summary.eaten).toBe(650);
    expect(summary.burned).toBe(2100);
    expect(summary.kgDelta).toBeLessThan(0);
  });
});
