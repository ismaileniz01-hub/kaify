import { describe, expect, it } from "vitest";
import {
  recommendOnboardingNutrition,
  type OnboardingNutritionInput,
} from "@/lib/nutrition/onboarding-recommendation";
import { ACTIVITY_LEVELS } from "@/lib/validations/onboarding.schema";
import { PRIMARY_GOALS } from "@/lib/validations/goals.schema";

const TODAY = new Date("2026-08-24T12:00:00Z");
const BASE: OnboardingNutritionInput = {
  gender: "male",
  birthDate: "1996-08-24",
  heightCm: 180,
  weightKg: 80,
  activityLevel: "moderately_active",
  trainingDaysPerWeek: 3,
  primaryGoal: "stay_fit",
};

const calories = (patch: Partial<OnboardingNutritionInput> = {}) =>
  recommendOnboardingNutrition({ ...BASE, ...patch }, TODAY).calorieTarget;
const maintenance = (patch: Partial<OnboardingNutritionInput> = {}) =>
  recommendOnboardingNutrition({ ...BASE, ...patch }, TODAY).maintenanceCalories;

describe("onboarding nutrition recommendation", () => {
  it("uses ordered Mifflin sex terms and a shared neutral term", () => {
    const male = calories({ gender: "male" });
    const female = calories({ gender: "female" });
    const other = calories({ gender: "other" });
    const privateGender = calories({ gender: "prefer_not_to_say" });

    expect(female).toBeLessThan(other);
    expect(other).toBeLessThan(male);
    expect(privateGender).toBe(other);
  });

  it("increases monotonically across lifestyle levels", () => {
    const targets = ACTIVITY_LEVELS.map((activityLevel) =>
      calories({ activityLevel }),
    );
    expect(targets).toEqual([...targets].sort((a, b) => a - b));
    expect(new Set(targets).size).toBe(targets.length);
  });

  it("keeps maintenance and calorie targets independent of planned training", () => {
    const recommendations = Array.from({ length: 8 }, (_, trainingDaysPerWeek) =>
      recommendOnboardingNutrition({ ...BASE, trainingDaysPerWeek }, TODAY),
    );
    expect(new Set(recommendations.map((item) => item.maintenanceCalories))).toEqual(
      new Set([recommendations[0].maintenanceCalories]),
    );
    expect(new Set(recommendations.map((item) => item.calorieTarget))).toEqual(
      new Set([recommendations[0].calorieTarget]),
    );
    expect(recommendations[7].workoutsTarget).toBe(7);
  });

  it("derives the goal-adjusted target from returned maintenance", () => {
    expect(calories({ primaryGoal: "lose_weight" })).toBe(
      Math.round(maintenance() * 0.85),
    );
    expect(calories({ primaryGoal: "stay_fit" })).toBe(maintenance());
    expect(calories({ primaryGoal: "build_muscle" })).toBe(
      Math.round(maintenance() * 1.1),
    );
  });

  it("applies all goal adjustments in the documented order", () => {
    const byGoal = Object.fromEntries(
      PRIMARY_GOALS.map((primaryGoal) => [
        primaryGoal,
        calories({ primaryGoal }),
      ]),
    );
    expect(byGoal.lose_weight).toBeLessThan(byGoal.recomposition);
    expect(byGoal.recomposition).toBeLessThan(byGoal.stay_fit);
    expect(byGoal.stay_fit).toBeLessThan(byGoal.endurance);
    expect(byGoal.endurance).toBeLessThan(byGoal.build_muscle);
  });

  it("clamps calories and maps zero training days to the API minimum", () => {
    expect(
      calories({
        birthDate: "1920-01-01",
        heightCm: 50,
        weightKg: 20,
        activityLevel: "sedentary",
        trainingDaysPerWeek: 0,
        primaryGoal: "lose_weight",
      }),
    ).toBe(800);
    expect(
      calories({
        birthDate: "2000-01-01",
        heightCm: 280,
        weightKg: 500,
        activityLevel: "athlete",
        trainingDaysPerWeek: 7,
        primaryGoal: "build_muscle",
      }),
    ).toBe(6000);
    expect(
      recommendOnboardingNutrition(
        { ...BASE, trainingDaysPerWeek: 0 },
        TODAY,
      ).workoutsTarget,
    ).toBe(1);
  });
});
