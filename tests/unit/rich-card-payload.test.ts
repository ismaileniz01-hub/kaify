import { describe, expect, it } from "vitest";
import {
  displayPlanLabel,
  looksLikeI18nKey,
  planDayHeading,
  resolveFoodCardMacros,
  unwrapChatCardPayload,
} from "@/lib/chat/rich-card-payload";
import { attachSpokenRichCard } from "@/lib/kaios/cards/spoken-card";
import { extractPhysiqueFromCoachText } from "@/lib/kaios/context/physique-summary";
import {
  parseWorkoutDaysFromSpeech,
  resolveWorkoutPlanDays,
} from "@/lib/kaios/plan-speech";

describe("resolveFoodCardMacros", () => {
  it("reads a spoken Maya calorie line when the payload has no chart", () => {
    expect(
      resolveFoodCardMacros(
        { intent: "meal_analysis" },
        "Kalori: 650 kcal. Protein: 40g, karbonhidrat: 70g, yağ: 18g.",
      ),
    ).toEqual({ calories: 650, protein: 40, carb: 70, fat: 18 });
  });

  it("reads food_analysis nested under ui", () => {
    expect(
      resolveFoodCardMacros({
        ui: {
          cardType: "analysis",
          food_analysis: { calories: 420, protein: 28, carb: 40, fat: 12 },
        },
      }),
    ).toEqual({ calories: 420, protein: 28, carb: 40, fat: 12 });
  });
});

describe("spoken rich cards", () => {
  it("turns Maya's macro sentence into the calorie card", () => {
    const envelope = attachSpokenRichCard({
      coachId: "maya",
      intent: "meal_analysis",
      assistantText: "Bu öğün yaklaşık 650 kcal, 40g protein, 70g karbonhidrat, 18g yağ.",
      envelope: {
        schema_version: "kaios.envelope.v1",
        coach: "maya",
        message: "Bu öğün yaklaşık 650 kcal, 40g protein, 70g karbonhidrat, 18g yağ.",
        intent: "meal_analysis",
      },
    });
    expect(envelope.ui).toMatchObject({
      cardType: "analysis",
      food_analysis: { calories: 650, protein: 40, carb: 70, fat: 18 },
    });
  });

  it("keeps a meal list on the meal-plan card", () => {
    const envelope = attachSpokenRichCard({
      coachId: "maya",
      intent: "meal_plan",
      assistantText: "Kahvaltıda yumurta.",
      envelope: {
        schema_version: "kaios.envelope.v1",
        coach: "maya",
        message: "Kahvaltıda yumurta.",
        ui: {
          meals: [{ label: "Kahvaltı", items: [{ name: "Yumurta", calories: 180 }] }],
        },
      },
    });
    expect(envelope.ui).toMatchObject({ cardType: "meal_plan" });
  });

  it("builds Leo's score card from the written list", () => {
    const text =
      "Physique read\n\nScores as observed:\n- Shoulders — 65\n- Chest — 60\n- Overall — 58";
    expect(extractPhysiqueFromCoachText(text)?.scores).toMatchObject({
      shoulders: 65,
      chests: 60,
    });
    const envelope = attachSpokenRichCard({
      coachId: "leo",
      intent: "physique_analysis",
      assistantText: text,
      envelope: {
        schema_version: "kaios.envelope.v1",
        coach: "leo",
        message: text,
      },
    });
    expect(envelope.ui).toMatchObject({ cardType: "score" });
    expect(envelope.data).toMatchObject({
      scores: { shoulders: 65, chests: 60 },
      overall_score: 58,
    });
  });
});

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
