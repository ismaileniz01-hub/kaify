import type { MovementClass } from "@/lib/training/progression";
import {
  GYM_EXERCISE_GROUPS,
  HOME_EXERCISE_GROUPS,
  type ExerciseGroupId,
} from "@/lib/exercise-library";

export type TemplateExercise = {
  exerciseKey: string;
  movement: MovementClass;
  targetSets: number;
  targetReps: number;
  loadKg: number;
};

export type TemplateDay = {
  dayIndex: number;
  labelKey: string;
  exercises: TemplateExercise[];
};

export type WorkoutTemplate = {
  slug: string;
  place: "gym" | "home";
  titleKey: string;
  days: TemplateDay[];
};

function movementForGroup(groupId: ExerciseGroupId): MovementClass {
  if (groupId === "legs") return "lower";
  if (groupId === "core") return "core";
  return "upper";
}

export function groupIdForExerciseKey(exerciseKey: string): ExerciseGroupId | null {
  for (const group of [...GYM_EXERCISE_GROUPS, ...HOME_EXERCISE_GROUPS]) {
    if (group.exercises.some((row) => row.key === exerciseKey)) return group.id;
  }
  return null;
}

export function movementForExerciseKey(exerciseKey: string): MovementClass {
  const group = groupIdForExerciseKey(exerciseKey);
  return group ? movementForGroup(group) : "upper";
}

export function substitutesFor(exerciseKey: string): string[] {
  const groupId = groupIdForExerciseKey(exerciseKey);
  if (!groupId) return [];
  const catalog = exerciseKey.includes(".home.")
    ? HOME_EXERCISE_GROUPS
    : GYM_EXERCISE_GROUPS;
  const group = catalog.find((row) => row.id === groupId);
  return (group?.exercises ?? [])
    .map((row) => row.key)
    .filter((key) => key !== exerciseKey);
}

export function isValidSwap(fromKey: string, toKey: string): boolean {
  return substitutesFor(fromKey).includes(toKey);
}

function item(
  exerciseKey: string,
  targetSets: number,
  targetReps: number,
): TemplateExercise {
  return {
    exerciseKey,
    movement: movementForExerciseKey(exerciseKey),
    targetSets,
    targetReps,
    loadKg: 0,
  };
}

export const WORKOUT_TEMPLATES: readonly WorkoutTemplate[] = [
  {
    slug: "gym-full-3",
    place: "gym",
    titleKey: "workout.template.gym_full",
    days: [
      {
        dayIndex: 0,
        labelKey: "workout.day.push",
        exercises: [
          item("library.ex.gym.bench_press", 3, 8),
          item("library.ex.gym.overhead_press", 3, 8),
          item("library.ex.gym.triceps_pushdown", 3, 10),
        ],
      },
      {
        dayIndex: 1,
        labelKey: "workout.day.pull",
        exercises: [
          item("library.ex.gym.lat_pulldown", 3, 8),
          item("library.ex.gym.seated_cable_row", 3, 10),
          item("library.ex.gym.barbell_curl", 3, 10),
        ],
      },
      {
        dayIndex: 2,
        labelKey: "workout.day.legs",
        exercises: [
          item("library.ex.gym.barbell_squat", 3, 8),
          item("library.ex.gym.romanian_deadlift", 3, 8),
          item("library.ex.gym.leg_curl", 3, 10),
        ],
      },
    ],
  },
  {
    slug: "home-full-3",
    place: "home",
    titleKey: "workout.template.home_full",
    days: [
      {
        dayIndex: 0,
        labelKey: "workout.day.push",
        exercises: [
          item("library.ex.home.wide_grip_pushups", 3, 10),
          item("library.ex.home.pike_pushups", 3, 8),
          item("library.ex.home.chair_pushups", 3, 10),
        ],
      },
      {
        dayIndex: 1,
        labelKey: "workout.day.pull",
        exercises: [
          item("library.ex.home.inverted_rows", 3, 8),
          item("library.ex.home.doorway_rows", 3, 10),
          item("library.ex.home.superman", 3, 12),
        ],
      },
      {
        dayIndex: 2,
        labelKey: "workout.day.legs",
        exercises: [
          item("library.ex.home.jump_squats", 3, 10),
          item("library.ex.home.glute_bridges", 3, 12),
          item("library.ex.home.wall_sit", 3, 8),
        ],
      },
    ],
  },
] as const;

export function templateBySlug(slug: string): WorkoutTemplate | null {
  return WORKOUT_TEMPLATES.find((row) => row.slug === slug) ?? null;
}
