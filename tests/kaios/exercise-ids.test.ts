import { describe, expect, it } from "vitest";
import {
  assertExerciseIdsExist,
  exerciseIdFromKey,
  getAllExerciseIds,
  getExerciseById,
  getExerciseCatalog,
  searchExercises,
} from "@/lib/kaios/exercises";

describe("KAIOS exercise ids", () => {
  it("derives stable snake_case ids from library keys", () => {
    expect(exerciseIdFromKey("library.ex.home.wide_grip_pushups")).toBe(
      "home_wide_grip_pushups",
    );
    expect(exerciseIdFromKey("library.ex.gym.bench_press")).toBe(
      "gym_bench_press",
    );
  });

  it("catalog covers home + gym without duplicate ids", () => {
    const catalog = getExerciseCatalog();
    expect(catalog.length).toBeGreaterThan(40);
    const ids = catalog.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(catalog.some((e) => e.equipment === "home")).toBe(true);
    expect(catalog.some((e) => e.equipment === "gym")).toBe(true);
  });

  it("disambiguates shared names across equipment", () => {
    expect(getExerciseById("home_front_raise")).toBeTruthy();
    expect(getExerciseById("gym_front_raise")).toBeTruthy();
    expect(getExerciseById("home_front_raise")!.id).not.toBe(
      getExerciseById("gym_front_raise")!.id,
    );
  });

  it("searchExercises filters by muscle/equipment/q with default limit 8", () => {
    const chestGym = searchExercises({
      muscle: "chest",
      equipment: "gym",
      q: "bench",
    });
    expect(chestGym.length).toBeGreaterThan(0);
    expect(chestGym.length).toBeLessThanOrEqual(8);
    expect(chestGym.every((e) => e.muscle === "chest" && e.equipment === "gym")).toBe(
      true,
    );
  });

  it("assertExerciseIdsExist returns invalid list", () => {
    const known = getAllExerciseIds()[0];
    const result = assertExerciseIdsExist([
      known,
      "not_a_real_exercise",
      known,
      "also_fake",
    ]);
    expect(result.valid).toEqual([known]);
    expect(result.invalid).toEqual(["not_a_real_exercise", "also_fake"]);
  });
});
