import { describe, expect, it } from "vitest";
import {
  dailyCardioExercise,
  ensureAlexDailyCardio,
  goalNeedsDailyCardio,
  withDailyCardioFinishers,
} from "@/lib/kaios/alex/daily-cardio";

const PUSH_PULL = [
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

describe("alex daily cardio", () => {
  it("treats fat loss and recomposition as daily-cardio goals", () => {
    expect(goalNeedsDailyCardio("lose_weight")).toBe(true);
    expect(goalNeedsDailyCardio("recomposition")).toBe(true);
    expect(goalNeedsDailyCardio("build_muscle")).toBe(false);
  });

  it("appends a 30 min Zone 2 finisher to every day that lacks one", () => {
    const { days, patched } = withDailyCardioFinishers(PUSH_PULL, "tr");
    expect(patched).toBe(true);
    expect(days[0]?.exercises?.at(-1)?.name).toContain("Kardiyo");
    expect(days[0]?.exercises?.at(-1)?.reps).toMatch(/30/);
    expect(days[1]?.exercises?.at(-1)?.name).toContain("Kardiyo");
  });

  it("does not duplicate an adequate 30 min cardio finisher", () => {
    const days = [
      {
        dayKey: "Wednesday",
        exercises: [
          { name: "Squat", sets: 4, reps: "6" },
          { name: "Zone 2 cardio", sets: 1, reps: "30min" },
        ],
      },
    ];
    const out = withDailyCardioFinishers(days, "en");
    expect(out.patched).toBe(false);
    expect(out.days[0]?.exercises).toHaveLength(2);
  });

  it("upgrades a short cardio finisher to 30 min", () => {
    const days = [
      {
        dayKey: "Thursday",
        exercises: [
          { name: "Deadlift", sets: 3, reps: "5" },
          { name: "Incline walk", sets: 1, reps: "12 min" },
        ],
      },
    ];
    const out = withDailyCardioFinishers(days, "en");
    expect(out.patched).toBe(true);
    expect(out.days[0]?.exercises).toHaveLength(2);
    expect(out.days[0]?.exercises?.at(-1)?.reps).toMatch(/30/);
  });

  it("injects cardio into an Alex fat-loss program envelope", () => {
    const out = ensureAlexDailyCardio({
      coachId: "alex",
      intent: "programming",
      locale: "tr",
      userState: "primary_goal: lose_weight; experience_level: intermediate",
      envelope: {
        message: "Pazartesi Push programın hazır.",
        ui: { cardType: "workout_plan", days: PUSH_PULL },
      },
    });
    const days = (out.ui as { days: typeof PUSH_PULL }).days;
    expect(days[0]?.exercises?.at(-1)?.name).toContain("Kardiyo");
    expect(out.message).toMatch(/30 dk Zone 2 kardiyo/i);
  });

  it("leaves muscle-gain programs unchanged", () => {
    const envelope = {
      message: "Pazartesi Push programın hazır.",
      ui: { cardType: "workout_plan", days: PUSH_PULL },
    };
    const out = ensureAlexDailyCardio({
      coachId: "alex",
      intent: "programming",
      locale: "en",
      userState: "primary_goal: build_muscle",
      envelope,
    });
    expect(out).toBe(envelope);
  });

  it("exports a 30 min finisher", () => {
    expect(dailyCardioExercise("en").reps).toMatch(/30/);
  });
});
