/**
 * KAIOS nutrition public API.
 * Until a catalog is wired, getNutritionProvider() returns model-estimate only.
 */

import { createModelEstimateProvider } from "@/lib/kaios/nutrition/model-estimate-provider";
import type { NutritionDataProvider } from "@/lib/kaios/nutrition/provider";

export type {
  FoodComposition,
  FoodObservation,
  MacroResult,
  NutritionProvenance,
  ResolveMacrosError,
  ResolveMacrosResult,
  ResolveMacrosSuccess,
} from "@/lib/kaios/nutrition/types";

export type { NutritionDataProvider } from "@/lib/kaios/nutrition/provider";
export {
  hasObservationMacros,
  isFiniteMacro,
  macrosFromObservationEstimate,
} from "@/lib/kaios/nutrition/provider";
export {
  ModelEstimateProvider,
  createModelEstimateProvider,
} from "@/lib/kaios/nutrition/model-estimate-provider";

/** Active provider — model-estimate fallback (no catalog configured). */
export function getNutritionProvider(): NutritionDataProvider {
  return createModelEstimateProvider();
}
