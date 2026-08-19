import { describe, expect, it } from "vitest";
import {
  hydrateTodaySnapshot,
  localDateKeysEnding,
  sumWeekWorkouts,
} from "@/lib/analytics/hydrate-today";

const emptyToday = {
  weightKg: null,
  calorieGoal: 2100,
  workoutsCompleted: 0,
  workoutsTarget: 5,
  waterGoalLiters: 2.5,
  proteinGoalG: 150,
  carbsGoalG: 250,
  fatGoalG: 65,
};

describe("hydrateTodaySnapshot", () => {
  it("shows last known weight when today has no weigh-in", () => {
    const hydrated = hydrateTodaySnapshot(emptyToday, {
      hasTodayRow: false,
      lastWeightKg: 78.4,
      lastGoals: { calorieGoal: 1840, workoutsTarget: 5 },
    });
    expect(hydrated.weightKg).toBe(78.4);
    expect(hydrated.calorieGoal).toBe(1840);
    expect(hydrated.workoutsCompleted).toBe(0);
  });

  it("carries last weight even when today already has a row without a weigh-in", () => {
    const hydrated = hydrateTodaySnapshot(emptyToday, {
      hasTodayRow: true,
      lastWeightKg: 78.4,
    });
    expect(hydrated.weightKg).toBe(78.4);
    expect(hydrated.workoutsCompleted).toBe(0);
    expect(hydrated.calorieGoal).toBe(2100);
  });

  it("does not overwrite today's logged weight or meals", () => {
    const hydrated = hydrateTodaySnapshot(
      { ...emptyToday, weightKg: 80, workoutsCompleted: 1, calorieGoal: 2100 },
      {
        hasTodayRow: true,
        lastWeightKg: 78.4,
        lastGoals: { calorieGoal: 1840 },
      },
    );
    expect(hydrated.weightKg).toBe(80);
    expect(hydrated.workoutsCompleted).toBe(1);
    expect(hydrated.calorieGoal).toBe(2100);
  });
});

describe("week helpers", () => {
  it("builds local date keys from today, not UTC midnight", () => {
    expect(localDateKeysEnding("2026-08-19", 7)).toEqual([
      "2026-08-13",
      "2026-08-14",
      "2026-08-15",
      "2026-08-16",
      "2026-08-17",
      "2026-08-18",
      "2026-08-19",
    ]);
  });

  it("sums this week's workouts including yesterday", () => {
    expect(
      sumWeekWorkouts([
        { workoutsCompleted: 0 },
        { workoutsCompleted: 1 },
        { workoutsCompleted: 0 },
      ]),
    ).toBe(1);
  });
});
