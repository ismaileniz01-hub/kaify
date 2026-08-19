import { describe, expect, it } from "vitest";
import {
  ensureStructuredPlanVisible,
  formatWorkoutPlanSpeech,
  looksLikeCuesOnlyWorkoutBlurb,
  parseWorkoutDaysFromSpeech,
  workoutSpeechMissingDays,
} from "@/lib/kaios/plan-speech";

const SAMPLE_DAYS = [
  {
    dayKey: "Pazartesi",
    focus: "Push",
    exercises: [
      { name: "Bench press", sets: 4, reps: "8" },
      { name: "Overhead press", sets: 3, reps: "10" },
    ],
  },
  {
    dayKey: "Salı",
    focus: "Pull",
    exercises: [{ name: "Lat pulldown", sets: 4, reps: "10" }],
  },
];

describe("plan-speech", () => {
  it("formats days and lifts with sets x reps", () => {
    const text = formatWorkoutPlanSpeech(SAMPLE_DAYS);
    expect(text).toContain("Pazartesi — Push");
    expect(text).toContain("• Bench press 4x8");
    expect(text).toContain("Salı — Pull");
  });

  it("detects a cues-only blurb as missing the schedule", () => {
    expect(
      workoutSpeechMissingDays(
        "İşte haftalık programın. Formu bozma, ego yapma.",
        SAMPLE_DAYS,
      ),
    ).toBe(true);
  });

  it("appends the schedule when programming speech has no days", () => {
    const out = ensureStructuredPlanVisible({
      intent: "programming",
      message: "İşte haftalık programın reis. Formu bozma.",
      ui: { cardType: "workout_plan", days: SAMPLE_DAYS },
    });
    expect(out).toContain("İşte haftalık programın");
    expect(out).toContain("Pazartesi — Push");
    expect(out).toContain("Bench press 4x8");
  });

  it("does not duplicate when the message already lists lifts", () => {
    const spoken = "Pazartesi Push: Bench press 4x8, Overhead press 3x10. Salı Pull: Lat pulldown 4x10.";
    const out = ensureStructuredPlanVisible({
      intent: "programming",
      message: spoken,
      ui: { cardType: "workout_plan", days: SAMPLE_DAYS },
    });
    expect(out).toBe(spoken);
  });

  it("parses em-dash weekday blocks from speech", () => {
    const days = parseWorkoutDaysFromSpeech(
      "İşte programın.\nPazartesi — Push\n• Bench press 4x8\n• Overhead press 3x10\nSalı — Pull\n• Lat pulldown 4x10",
    );
    expect(days).toHaveLength(2);
    expect(days[0]?.exercises).toHaveLength(2);
  });

  it("flags a split recap without days as cues-only", () => {
    expect(
      looksLikeCuesOnlyWorkoutBlurb(
        "Tamam kral, 5 günlük split hazır. Göğüs ve sırt zayıf, PPL + üst vücut + alt vücut. Forma dikkat, ego yapma.",
      ),
    ).toBe(true);
    expect(
      looksLikeCuesOnlyWorkoutBlurb(
        "Pazartesi — Push\n• Bench press 4x8\nSalı — Pull\n• Row 4x10",
      ),
    ).toBe(false);
  });

  it("appends meals when a meal-plan blurb has no food names", () => {
    const out = ensureStructuredPlanVisible({
      intent: "meal_plan",
      message: "İşte düzenin, proteinı kaçırma.",
      ui: {
        cardType: "meal_plan",
        meals: [
          {
            label: "Kahvaltı",
            items: [{ name: "Yulaf", calories: 350 }],
          },
          {
            label: "Öğle",
            items: [{ name: "Tavuk pilav", calories: 600 }],
          },
        ],
      },
    });
    expect(out).toContain("Yulaf 350 kcal");
    expect(out).toContain("Tavuk pilav");
  });
});
