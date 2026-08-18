import { describe, expect, it } from "vitest";
import {
  looksLikeWorkoutCompletion,
  parseHydrationLiters,
  parseWorkoutCompletion,
  patchForCoachChatLog,
} from "@/lib/kaios/analytics/chat-log";
import {
  estimateCaloriesFromWorkoutPlan,
  parseCaloriesBurnedFromText,
  pickSessionExercises,
} from "@/lib/kaios/analytics/workout-log";

describe("Alex workout completion → analytics patch", () => {
  it("detects Turkish and English session logs", () => {
    expect(looksLikeWorkoutCompletion("antrenman bitti")).toBe(true);
    expect(looksLikeWorkoutCompletion("bugün spor yaptım")).toBe(true);
    expect(looksLikeWorkoutCompletion("I finished my workout")).toBe(true);
    expect(looksLikeWorkoutCompletion("workout done")).toBe(true);
    expect(looksLikeWorkoutCompletion("log my workout")).toBe(true);
  });

  it("does not treat programming or form questions as logs", () => {
    expect(looksLikeWorkoutCompletion("bana antrenman programı yap")).toBe(
      false,
    );
    expect(looksLikeWorkoutCompletion("How do I squat?")).toBe(false);
    expect(looksLikeWorkoutCompletion("3 set yaptım")).toBe(false);
  });

  it("defaults to 1 session and optional burn kcal", () => {
    expect(parseWorkoutCompletion("antrenmanı bitirdim")).toEqual({
      workoutsCompleted: 1,
    });
    expect(
      parseWorkoutCompletion("2 antrenman yaptım, 400 kcal yaktım"),
    ).toEqual({ workoutsCompleted: 2, caloriesBurned: 400 });
  });

  it("builds an Alex patch and skips other coaches", () => {
    expect(
      patchForCoachChatLog("alex", "I finished my workout"),
    ).toMatchObject({
      patch: { workoutsCompleted: 1 },
      tool: "logWorkout",
    });
    expect(
      patchForCoachChatLog("alex", "I finished my workout")?.patch
        .caloriesBurned,
    ).toBeUndefined();
    expect(
      patchForCoachChatLog("alex", "antrenman bitti", {
        currentWorkouts: 0,
        currentBurned: 0,
        sessionKcal: 380,
      }),
    ).toMatchObject({
      patch: { workoutsCompleted: 1, caloriesBurned: 380 },
    });
    expect(patchForCoachChatLog("kai", "antrenmanı bitirdim")).toBeNull();
    expect(patchForCoachChatLog("leo", "antrenmanı bitirdim")).toBeNull();
  });
});

describe("Maya hydration log → analytics patch", () => {
  it("parses liters and ml with a drink verb", () => {
    expect(parseHydrationLiters("2 litre su içtim")).toBe(2);
    expect(parseHydrationLiters("I drank 500ml of water")).toBe(0.5);
    expect(parseHydrationLiters("2.5L içtim")).toBe(2.5);
  });

  it("does not invent amounts on reminders", () => {
    expect(parseHydrationLiters("su içmem lazım")).toBeNull();
    expect(parseHydrationLiters("drink more water today")).toBeNull();
    expect(parseHydrationLiters("I drank water")).toBeNull();
  });

  it("only Maya can queue a water patch", () => {
    expect(patchForCoachChatLog("maya", "2 litre su içtim")).toEqual({
      tool: "recordHydration",
      summary: "2L water",
      patch: { waterLiters: 2 },
    });
    expect(patchForCoachChatLog("alex", "2 litre su içtim")).toBeNull();
  });

  it("adds today's water instead of overwriting it", () => {
    expect(
      patchForCoachChatLog("maya", "I drank 500ml of water", {
        currentWater: 1.5,
      }),
    ).toEqual({
      tool: "recordHydration",
      summary: "0.5L water",
      patch: { waterLiters: 2 },
    });
  });
});

describe("session burn without a stock 400", () => {
  it("does not invent kcal from the goal", () => {
    expect(parseCaloriesBurnedFromText("Güzel iş reis")).toBeNull();
  });

  it("reads a named burn from coach copy", () => {
    expect(
      parseCaloriesBurnedFromText("Bu seans yaklaşık 360 kcal yaktın."),
    ).toBe(360);
  });

  it("estimates from the programmed session + bodyweight", () => {
    const kcal = estimateCaloriesFromWorkoutPlan(
      {
        exercises: [
          { name: "Bench Press", sets: 4, reps: "8" },
          { name: "Row", sets: 4, reps: "10" },
          { name: "Incline walk", sets: 1, reps: "15 min" },
        ],
      },
      80,
    );
    expect(kcal).toBeGreaterThan(200);
    expect(kcal).toBeLessThan(700);
    expect(kcal).not.toBe(400);
  });

  it("estimates the matching split day instead of always day 1", () => {
    const plan = {
      days: [
        {
          focusKey: "Push",
          exercises: [
            { name: "Bench Press", sets: 5, reps: "5" },
            { name: "OHP", sets: 4, reps: "8" },
            { name: "Incline walk", sets: 1, reps: "20 min" },
          ],
        },
        {
          focusKey: "Pull",
          exercises: [{ name: "Barbell Row", sets: 3, reps: "8" }],
        },
      ],
    };
    const push = pickSessionExercises(plan, "push bitirdim");
    const pull = pickSessionExercises(plan, "pull antrenmanı bitti");
    expect(push?.[0]?.name).toBe("Bench Press");
    expect(pull?.[0]?.name).toBe("Barbell Row");
    const pushKcal = estimateCaloriesFromWorkoutPlan(plan, 80, "push bitirdim");
    const pullKcal = estimateCaloriesFromWorkoutPlan(plan, 80, "pull antrenmanı bitti");
    expect(pushKcal).toBeGreaterThan(pullKcal ?? 0);
  });
});
