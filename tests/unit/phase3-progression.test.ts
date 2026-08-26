import { describe, expect, it } from "vitest";
import {
  clampLoadJump,
  isUnsafeLoadJump,
  nextPrescription,
  type SetPrescription,
} from "@/lib/training/progression";
import { isValidSwap, templateBySlug, WORKOUT_TEMPLATES } from "@/lib/training/templates";

const bench: SetPrescription = {
  exerciseKey: "library.ex.gym.bench_press",
  movement: "upper",
  targetSets: 3,
  targetReps: 8,
  loadKg: 50,
};

describe("F3 double-progression rules", () => {
  it("increments upper body load only when all sets hit the target", () => {
    const next = nextPrescription(bench, {
      status: "completed",
      logged: [
        { exerciseKey: bench.exerciseKey, reps: 8, loadKg: 50 },
        { exerciseKey: bench.exerciseKey, reps: 8, loadKg: 50 },
        { exerciseKey: bench.exerciseKey, reps: 8, loadKg: 50 },
      ],
    });
    expect(next.loadKg).toBe(52.5);
  });

  it("holds load when a set misses the target", () => {
    const next = nextPrescription(bench, {
      status: "completed",
      logged: [
        { exerciseKey: bench.exerciseKey, reps: 8, loadKg: 50 },
        { exerciseKey: bench.exerciseKey, reps: 6, loadKg: 50 },
        { exerciseKey: bench.exerciseKey, reps: 8, loadKg: 50 },
      ],
    });
    expect(next.loadKg).toBe(50);
  });

  it("clamps load jumps to 10 percent", () => {
    expect(clampLoadJump(100, 130)).toBe(110);
    expect(isUnsafeLoadJump(100, 115)).toBe(true);
    expect(isUnsafeLoadJump(100, 110)).toBe(false);
  });

  it("reduces volume after a missed session and load on deload", () => {
    expect(nextPrescription(bench, { status: "missed" }).targetSets).toBe(2);
    expect(nextPrescription(bench, { status: "deload" }).loadKg).toBe(30);
    expect(nextPrescription(bench, { status: "rest" })).toEqual(bench);
  });
});

describe("F3 reusable templates", () => {
  it("ships gym and home 3-day templates from the exercise catalog", () => {
    expect(WORKOUT_TEMPLATES.map((row) => row.slug)).toEqual(["gym-full-3", "home-full-3"]);
    expect(templateBySlug("gym-full-3")?.days).toHaveLength(3);
  });

  it("allows swaps only inside the same muscle group", () => {
    expect(isValidSwap("library.ex.gym.bench_press", "library.ex.gym.incline_bench_press")).toBe(
      true,
    );
    expect(isValidSwap("library.ex.gym.bench_press", "library.ex.gym.barbell_squat")).toBe(false);
  });
});
