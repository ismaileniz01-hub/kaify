import { describe, expect, it } from "vitest";
import { countConsecutiveRestDays, gymSkipFacts } from "@/lib/ai/count-consecutive-rest-days";
import { formatTrustedProfileContext } from "@/lib/ai/chat-context";
import { buildChatSystemPrompt } from "@/lib/ai/personas";

describe("countConsecutiveRestDays", () => {
  it("returns 0 when today has a logged workout", () => {
    const rows = [
      { entry_date: "2026-07-04", workouts_completed: 1 },
      { entry_date: "2026-07-03", workouts_completed: 0 },
    ];
    expect(countConsecutiveRestDays(rows, "2026-07-04")).toBe(0);
  });

  it("counts consecutive rest days including today", () => {
    const rows = [
      { entry_date: "2026-07-04", workouts_completed: 0 },
      { entry_date: "2026-07-03", workouts_completed: 0 },
      { entry_date: "2026-07-02", workouts_completed: 1 },
    ];
    expect(countConsecutiveRestDays(rows, "2026-07-04")).toBe(2);
  });

  it("counts missing rows as rest days", () => {
    const rows = [{ entry_date: "2026-07-02", workouts_completed: 1 }];
    expect(countConsecutiveRestDays(rows, "2026-07-04")).toBe(2);
  });

  it("does not claim a gym skip when no workouts were ever logged", () => {
    expect(gymSkipFacts([], 14)).toEqual([]);
    expect(
      gymSkipFacts([{ entry_date: "2026-07-04", workouts_completed: 0 }], 14),
    ).toEqual([]);
  });

  it("claims a gym skip only after a logged workout exists", () => {
    const rows = [
      { entry_date: "2026-07-02", workouts_completed: 1 },
      { entry_date: "2026-07-04", workouts_completed: 0 },
    ];
    expect(gymSkipFacts(rows, 2).join(" ")).toMatch(/consecutive days without gym: 2/);
  });
});

describe("formatTrustedProfileContext", () => {
  it("serializes onboarding programming fields for USER_CONTEXT", () => {
    const summary = formatTrustedProfileContext({
      primaryGoal: "build_muscle",
      experienceLevel: "intermediate",
      trainingDaysPerWeek: 4,
      activityLevel: "very_active",
      heightCm: 178,
      weightKg: 82.4,
      dietaryPreference: "omnivore",
      dislikedFoods: "mushrooms",
      healthConditions: "left knee pain",
    });
    expect(summary).toContain("primary_goal: build_muscle");
    expect(summary).toContain("experience_level: intermediate");
    expect(summary).toContain("training_days_per_week: 4");
    expect(summary).toContain("activity_level: very_active");
    expect(summary).toContain("height_cm: 178");
    expect(summary).toContain("weight_kg: 82.4");
    expect(summary).toContain("dietary_preference: omnivore");
    expect(summary).toContain("disliked_foods: mushrooms");
    expect(summary).toContain("health_limitations: left knee pain");
    expect(summary).not.toContain("equipment_access");
  });

  it("omits empty and out-of-range values", () => {
    expect(
      formatTrustedProfileContext({
        experienceLevel: "  ",
        trainingDaysPerWeek: 9,
        heightCm: 10,
        weightKg: Number.NaN,
        equipmentAccess: null,
      }),
    ).toBe("");
  });
});

describe("buildChatSystemPrompt (Kai)", () => {
  const sampleLocales = ["tr", "en", "de", "fr", "ar", "ja", "hi", "pt", "es-mx", "zh-CN"] as const;

  it.each(sampleLocales)("includes accountability + native locale for %s", (locale) => {
    const prompt = buildChatSystemPrompt({
      coachId: "kai",
      coachName: "Kai",
      coachPersonality: "Warm teammate.",
      locale,
      stateSummary: "consecutive days without gym: 5",
    });

    expect(prompt).toContain("KAI ACCOUNTABILITY");
    expect(prompt).toContain("DO NOT say 'okay skip it'");
    expect(prompt).toContain("Settings language");
    expect(prompt).toContain(`"${locale}"`);
    expect(prompt).toContain("consecutive days without gym: 5");
    expect(prompt).not.toContain("kanka");
    expect(prompt).not.toContain("nasılsın");
    expect(prompt).toContain("Do not interview for data you already have");
  });
});
