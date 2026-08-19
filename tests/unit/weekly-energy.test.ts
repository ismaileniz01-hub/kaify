import { describe, expect, it } from "vitest";
import { summarizeWeeklyEnergy } from "@/lib/analytics/weekly-energy";

describe("summarizeWeeklyEnergy", () => {
  it("stays at zero when the week has no meals or burns", () => {
    expect(
      summarizeWeeklyEnergy(
        [{ caloriesConsumed: 0, caloriesBurned: 0 }, { caloriesConsumed: 0 }],
        2100,
      ),
    ).toEqual({ eaten: 0, burned: 0, kgDelta: 0 });
  });

  it("does not treat empty days as a full-week deficit", () => {
    const week = Array.from({ length: 7 }, () => ({
      caloriesConsumed: 0,
      caloriesBurned: 0,
    }));
    expect(summarizeWeeklyEnergy(week, 2100).kgDelta).toBe(0);
  });

  it("estimates given kg from logged days under goal plus burn", () => {
    const summary = summarizeWeeklyEnergy(
      [
        { caloriesConsumed: 1800, caloriesBurned: 200 },
        { caloriesConsumed: 1800, caloriesBurned: 200 },
        { caloriesConsumed: 1800, caloriesBurned: 0 },
      ],
      2100,
    );
    expect(summary.eaten).toBe(5400);
    expect(summary.burned).toBe(400);
    // net = 5400 - 400 - 2100*3 = -1300 → -0.2 kg
    expect(summary.kgDelta).toBe(-0.2);
  });
});
