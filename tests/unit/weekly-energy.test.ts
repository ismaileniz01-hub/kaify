import { describe, expect, it } from "vitest";
import { summarizeWeeklyEnergy } from "@/lib/analytics/weekly-energy";

describe("summarizeWeeklyEnergy", () => {
  const fallback = { calorieGoal: 1800, maintenanceCalories: 2100 };

  it("counts each elapsed day's own intake target with current-goal fallback", () => {
    const summary = summarizeWeeklyEnergy(
      [
        { calorieGoal: 1700, caloriesConsumed: 1600, foodLogged: true },
        { calorieGoal: 1750, caloriesConsumed: 1800, foodLogged: true },
        { caloriesConsumed: 0, foodLogged: false },
      ],
      fallback,
    );
    expect(summary.budgetTargetToDate).toBe(5250);
    expect(summary.consumed).toBe(3400);
    expect(summary.remaining).toBe(1850);
    expect(summary.over).toBe(0);
  });

  it("reports over-budget intake separately", () => {
    const summary = summarizeWeeklyEnergy(
      [{ caloriesConsumed: 2000, calorieGoal: 1800, foodLogged: true }],
      fallback,
    );
    expect(summary.remaining).toBe(0);
    expect(summary.over).toBe(200);
  });

  it("does not treat missing food days as energy deficits", () => {
    const week = Array.from({ length: 4 }, () => ({
      caloriesConsumed: 0,
      caloriesBurned: 0,
      foodLogged: false,
    }));
    const summary = summarizeWeeklyEnergy(week, fallback);
    expect(summary.energyBurned).toBe(0);
    expect(summary.energyBalance).toBe(0);
    expect(summary.loggedDays).toBe(0);
    expect(summary.estimatedWeightChangeKg).toBeNull();
  });

  it("uses maintenance plus workout once on food-logged days", () => {
    const summary = summarizeWeeklyEnergy(
      [
        {
          caloriesConsumed: 1800,
          caloriesBurned: 200,
          maintenanceCalories: 2100,
          foodLogged: true,
        },
        {
          caloriesConsumed: 1900,
          caloriesBurned: 300,
          maintenanceCalories: 2200,
          foodLogged: true,
        },
      ],
      fallback,
    );
    expect(summary.energyBurned).toBe(4800);
    expect(summary.energyBalance).toBe(-1100);
  });

  it("requires four complete elapsed days before estimating weight change", () => {
    const completeDay = {
      caloriesConsumed: 1800,
      maintenanceCalories: 2100,
      foodLogged: true,
    };
    const summary = summarizeWeeklyEnergy(
      [completeDay, completeDay, completeDay, completeDay],
      fallback,
    );
    expect(summary.estimatedWeightChangeKg).toBe(-0.2);
    expect(
      summarizeWeeklyEnergy(
        [completeDay, completeDay, completeDay],
        fallback,
      ).estimatedWeightChangeKg,
    ).toBeNull();
  });

  it("withholds the estimate when any elapsed day lacks food data", () => {
    const summary = summarizeWeeklyEnergy(
      [
        { caloriesConsumed: 1800, foodLogged: true },
        { caloriesConsumed: 1800, foodLogged: true },
        { caloriesConsumed: 1800, foodLogged: true },
        { caloriesConsumed: 0, foodLogged: false },
      ],
      fallback,
    );
    expect(summary.loggedDays).toBe(3);
    expect(summary.elapsedDays).toBe(4);
    expect(summary.estimatedWeightChangeKg).toBeNull();
  });
});
