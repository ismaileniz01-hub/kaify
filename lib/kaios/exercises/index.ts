/**
 * KAIOS exercise catalog — stable ids, search, and validation.
 */

export type {
  CatalogExercise,
  ExerciseEquipment,
} from "@/lib/kaios/exercises/catalog";

export {
  exerciseIdFromKey,
  displayNameFromKey,
  getExerciseCatalog,
  getExerciseById,
  getAllExerciseIds,
} from "@/lib/kaios/exercises/catalog";

export {
  searchExercises,
  type SearchExercisesOptions,
} from "@/lib/kaios/exercises/search";

export {
  assertExerciseIdsExist,
  type AssertExerciseIdsResult,
} from "@/lib/kaios/exercises/validate";
