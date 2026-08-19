import { describe, expect, it } from "vitest";
import {
  displayPlanLabel,
  looksLikeI18nKey,
  planDayHeading,
  unwrapChatCardPayload,
} from "@/lib/chat/rich-card-payload";
import {
  parseWorkoutDaysFromSpeech,
  resolveWorkoutPlanDays,
} from "@/lib/kaios/plan-speech";

describe("unwrapChatCardPayload", () => {
  it("reads meal_plan fields from nested ui", () => {
    const unwrapped = unwrapChatCardPayload({
      schema_version: "1",
      ui: {
        cardType: "meal_plan",
        totalCalories: 1800,
        targetCalories: 2100,
        meals: [{ labelKey: "meal.breakfast", items: [{ name: "Eggs", calories: 300 }] }],
      },
    });
    expect(unwrapped.totalCalories).toBe(1800);
    expect(unwrapped.targetCalories).toBe(2100);
    expect(Array.isArray(unwrapped.meals)).toBe(true);
  });
});

describe("plan day labels", () => {
  it("prefers focus/name over missing i18n keys", () => {
    expect(
      planDayHeading({ name: "Push", exercises: [] }),
    ).toEqual({ focus: "Push" });
    expect(planDayHeading({ day: "Pazartesi", focus: "Push" })).toEqual({
      day: "Pazartesi",
      focus: "Push",
    });
    expect(looksLikeI18nKey("workout.chest_triceps")).toBe(true);
    expect(looksLikeI18nKey("Push")).toBe(false);
    expect(displayPlanLabel("workout.chest_triceps", (key) => `t:${key}`)).toBe(
      "t:workout.chest_triceps",
    );
    expect(displayPlanLabel("Pull", (key) => `t:${key}`)).toBe("Pull");
  });
});

describe("resolveWorkoutPlanDays", () => {
  it("reads days from nested ui", () => {
    const days = resolveWorkoutPlanDays({
      schema_version: "1",
      ui: {
        cardType: "workout_plan",
        days: [
          {
            day: "Pazartesi",
            focus: "Push",
            exercises: [{ exercise_name: "Bench press", sets: 4, reps: "8" }],
          },
        ],
      },
    });
    expect(days).toHaveLength(1);
    expect(days[0]?.day).toBe("Pazartesi");
    expect(days[0]?.focus).toBe("Push");
    expect(days[0]?.exercises[0]?.name).toBe("Bench press");
    expect(days[0]?.exercises[0]?.sets).toBe("4");
  });

  it("parses spoken em-dash schedule when ui.days is missing", () => {
    const days = resolveWorkoutPlanDays(
      { coach: "alex", intent: "programming" },
      "Pazartesi — Push\n• Bench press 4x8\nSalı — Pull\n• Lat pulldown 4x10",
    );
    expect(days.map((d) => d.day)).toEqual(["Pazartesi", "Salı"]);
    expect(days[0]?.exercises[0]).toMatchObject({ name: "Bench press", sets: "4", reps: "8" });
  });
});

describe("parseWorkoutDaysFromSpeech", () => {
  it("accepts Gün N headings and numbered lifts", () => {
    const days = parseWorkoutDaysFromSpeech(
      "Gün 1 — Göğüs\n1. Bench press 4x8-10\nGün 2 — Sırt\n2. Lat pulldown 3x12",
    );
    expect(days).toHaveLength(2);
    expect(days[0]?.dayKey).toBe("Gün 1");
    expect(days[0]?.exercises?.[0]?.name).toBe("Bench press");
  });
});
