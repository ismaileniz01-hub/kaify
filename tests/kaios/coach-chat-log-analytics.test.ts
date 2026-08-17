import { describe, expect, it } from "vitest";
import {
  looksLikeWorkoutCompletion,
  parseHydrationLiters,
  parseWorkoutCompletion,
  patchForCoachChatLog,
} from "@/lib/kaios/analytics/chat-log";

describe("Alex workout completion → analytics patch", () => {
  it("detects Turkish and English session logs", () => {
    expect(looksLikeWorkoutCompletion("antrenmanı bitirdim")).toBe(true);
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
});
