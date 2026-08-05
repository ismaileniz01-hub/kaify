import { describe, expect, it } from "vitest";
import { goalsPatchSchema } from "@/lib/validations/goals.schema";

describe("goalsPatchSchema", () => {
  it("accepts a full goals payload", () => {
    const parsed = goalsPatchSchema.safeParse({
      primaryGoal: "build_muscle",
      calorieGoal: 2400,
      workoutsTarget: 4,
      waterGoalLiters: 3,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects empty patches", () => {
    expect(goalsPatchSchema.safeParse({}).success).toBe(false);
  });

  it("rejects out-of-range calories", () => {
    expect(
      goalsPatchSchema.safeParse({ calorieGoal: 100 }).success,
    ).toBe(false);
  });
});
