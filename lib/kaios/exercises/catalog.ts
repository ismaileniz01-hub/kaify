/**
 * Stable snake_case exercise catalog derived from lib/exercise-library.ts.
 */

import {
  GYM_EXERCISE_GROUPS,
  HOME_EXERCISE_GROUPS,
  type ExerciseGroupId,
} from "@/lib/exercise-library";

export type ExerciseEquipment = "home" | "gym";

export type CatalogExercise = {
  /** Stable snake_case id, e.g. home_wide_grip_pushups */
  id: string;
  /** Original i18n key under library.ex.* */
  key: string;
  /** Human-ish slug derived from the key name segment */
  name: string;
  muscle: ExerciseGroupId;
  equipment: ExerciseEquipment;
};

/** library.ex.home.wide_grip_pushups → home_wide_grip_pushups */
export function exerciseIdFromKey(key: string): string {
  const stripped = key.replace(/^library\.ex\./, "");
  return stripped
    .split(".")
    .filter(Boolean)
    .join("_")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/** library.ex.gym.bench_press → "bench press" */
export function displayNameFromKey(key: string): string {
  const parts = key.replace(/^library\.ex\./, "").split(".");
  const slug = parts[parts.length - 1] ?? key;
  return slug.replace(/_/g, " ");
}

function buildCatalog(): CatalogExercise[] {
  const out: CatalogExercise[] = [];
  const seen = new Set<string>();

  const pushGroup = (
    equipment: ExerciseEquipment,
    groups: typeof HOME_EXERCISE_GROUPS,
  ) => {
    for (const group of groups) {
      for (const ex of group.exercises) {
        const id = exerciseIdFromKey(ex.key);
        if (seen.has(id)) continue;
        seen.add(id);
        out.push({
          id,
          key: ex.key,
          name: displayNameFromKey(ex.key),
          muscle: group.id,
          equipment,
        });
      }
    }
  };

  pushGroup("home", HOME_EXERCISE_GROUPS);
  pushGroup("gym", GYM_EXERCISE_GROUPS);
  return out;
}

const CATALOG: CatalogExercise[] = buildCatalog();
const BY_ID = new Map(CATALOG.map((e) => [e.id, e]));

export function getExerciseCatalog(): readonly CatalogExercise[] {
  return CATALOG;
}

export function getExerciseById(id: string): CatalogExercise | undefined {
  return BY_ID.get(id);
}

export function getAllExerciseIds(): string[] {
  return CATALOG.map((e) => e.id);
}
