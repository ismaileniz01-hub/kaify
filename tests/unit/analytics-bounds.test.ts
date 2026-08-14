import { describe, expect, it } from "vitest";
import {
  ANALYTICS_BOUNDS,
  sanitizeAnalyticsNumber,
  sanitizeAnalyticsPatch,
  sanitizeMealMacros,
} from "@/lib/analytics/bounds";

describe("analytics bounds", () => {
  it("inventories every persisted numeric field", () => {
    expect(ANALYTICS_BOUNDS.map((b) => b.field)).toEqual([
      "weight_kg",
      "calories_consumed",
      "calories_burned",
      "calorie_goal",
      "workouts_completed",
      "workouts_target",
      "water_liters",
      "water_goal_liters",
      "steps",
      "protein_g",
      "carbs_g",
      "fat_g",
      "protein_goal_g",
      "carbs_goal_g",
      "fat_goal_g",
    ]);
  });

  it("rejects NaN and Infinity before persistence", () => {
    expect(sanitizeAnalyticsNumber("calories_consumed", Number.NaN)).toBeUndefined();
    expect(sanitizeAnalyticsNumber("calories_consumed", Number.POSITIVE_INFINITY)).toBeUndefined();
    expect(sanitizeAnalyticsPatch({ calories_consumed: "nope" })).toEqual({});
  });

  it("clamps negatives and absurd values", () => {
    expect(sanitizeAnalyticsNumber("calories_consumed", -12)).toBe(0);
    expect(sanitizeAnalyticsNumber("calories_consumed", 99_999)).toBe(20_000);
    expect(sanitizeAnalyticsNumber("weight_kg", 3)).toBe(20);
    expect(sanitizeAnalyticsNumber("steps", 5_000_000)).toBe(500_000);
  });

  it("allows boundary and normal values", () => {
    expect(sanitizeAnalyticsNumber("calories_consumed", 0)).toBe(0);
    expect(sanitizeAnalyticsNumber("calories_consumed", 20_000)).toBe(20_000);
    expect(sanitizeAnalyticsNumber("protein_g", 150)).toBe(150);
  });

  it("keeps nullable weight as null", () => {
    expect(sanitizeAnalyticsNumber("weight_kg", null)).toBeNull();
  });

  it("sanitizes meal macros", () => {
    expect(sanitizeMealMacros({ calories: -1, protein: 9_000, carbs: 10, fat: 5 })).toEqual({
      calories: 0,
      protein: 2_000,
      carbs: 10,
      fat: 5,
    });
  });
});
