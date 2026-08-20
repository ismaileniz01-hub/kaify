import { describe, expect, it } from "vitest";
import { KCAL_PER_KG, summarizeWeeklyEnergy } from "@/lib/analytics/weekly-energy";

describe("summarizeWeeklyEnergy", () => {
  it("shows 7700 kcal still to give and 0 kg when the week is empty", () => {
    expect(
      summarizeWeeklyEnergy(
        [{ caloriesConsumed: 0, caloriesBurned: 0 }, { caloriesConsumed: 0 }],
        2100,
      ),
    ).toEqual({ eaten: 0, burned: KCAL_PER_KG, kgDelta: 0 });
  });

  it("does not treat empty days as a full-week deficit", () => {
    const week = Array.from({ length: 7 }, () => ({
      caloriesConsumed: 0,
      caloriesBurned: 0,
    }));
    expect(summarizeWeeklyEnergy(week, 2100).kgDelta).toBe(0);
    expect(summarizeWeeklyEnergy(week, 2100).burned).toBe(KCAL_PER_KG);
  });

  it("puts remaining kcal-to-1kg in verilen from food vs goal, ignoring workout burn", () => {
    const summary = summarizeWeeklyEnergy(
      [
        { caloriesConsumed: 1800, caloriesBurned: 200 },
        { caloriesConsumed: 1800, caloriesBurned: 200 },
        { caloriesConsumed: 1800, caloriesBurned: 0 },
      ],
      2100,
    );
    expect(summary.eaten).toBe(5400);
    // net = 5400 - 2100*3 = -900 → -0.1 kg, 6800 kcal left to 1 kg
    expect(summary.kgDelta).toBe(-0.1);
    expect(summary.burned).toBe(KCAL_PER_KG - 900);
  });

  it("does not invent a full-day deficit from a workout-only day", () => {
    const summary = summarizeWeeklyEnergy(
      [{ caloriesConsumed: 0, caloriesBurned: 400 }],
      2100,
    );
    expect(summary.eaten).toBe(0);
    expect(summary.burned).toBe(KCAL_PER_KG);
    expect(summary.kgDelta).toBe(0);
  });

  it("does not show a kg drop while verilen is 0", () => {
    const summary = summarizeWeeklyEnergy(
      [{ caloriesConsumed: 650, caloriesBurned: 0 }],
      2100,
    );
    expect(summary.eaten).toBe(650);
    expect(summary.burned).toBeGreaterThan(0);
    expect(summary.kgDelta).toBeLessThan(0);
  });
});
