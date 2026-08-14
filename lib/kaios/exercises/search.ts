/**
 * Search the KAIOS exercise catalog by muscle, equipment, and free-text query.
 */

import {
  getExerciseCatalog,
  type CatalogExercise,
  type ExerciseEquipment,
} from "@/lib/kaios/exercises/catalog";
import type { ExerciseGroupId } from "@/lib/exercise-library";

export type SearchExercisesOptions = {
  muscle?: ExerciseGroupId | string;
  equipment?: ExerciseEquipment | string;
  q?: string;
  /** Soft max; default 8. */
  limit?: number;
};

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

/**
 * Filter catalog exercises. Default limit 8.
 */
export function searchExercises(
  options: SearchExercisesOptions = {},
): CatalogExercise[] {
  const limit =
    typeof options.limit === "number" && Number.isFinite(options.limit)
      ? Math.max(0, Math.floor(options.limit))
      : 8;

  const muscle = options.muscle ? normalize(options.muscle) : undefined;
  const equipment = options.equipment
    ? normalize(options.equipment)
    : undefined;
  const q = options.q ? normalize(options.q) : undefined;

  const results: CatalogExercise[] = [];
  for (const ex of getExerciseCatalog()) {
    if (muscle && ex.muscle !== muscle) continue;
    if (equipment && ex.equipment !== equipment) continue;
    if (q) {
      const hay = `${ex.id} ${ex.name} ${ex.key} ${ex.muscle}`.toLowerCase();
      if (!hay.includes(q) && !q.split(/\s+/).every((tok) => hay.includes(tok))) {
        continue;
      }
    }
    results.push(ex);
    if (results.length >= limit) break;
  }
  return results;
}
