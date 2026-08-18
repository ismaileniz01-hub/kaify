import { describe, expect, it } from "vitest";
import {
  displayPlanLabel,
  looksLikeI18nKey,
  planDayHeading,
  unwrapChatCardPayload,
} from "@/lib/chat/rich-card-payload";

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
    expect(looksLikeI18nKey("workout.chest_triceps")).toBe(true);
    expect(looksLikeI18nKey("Push")).toBe(false);
    expect(displayPlanLabel("workout.chest_triceps", (key) => `t:${key}`)).toBe(
      "t:workout.chest_triceps",
    );
    expect(displayPlanLabel("Pull", (key) => `t:${key}`)).toBe("Pull");
  });
});
