/**
 * NutritionDataProvider — owns nutrient composition resolution.
 * Gemini observations feed in; this layer decides provenance.
 */

import type {
  FoodComposition,
  FoodObservation,
  MacroResult,
  ResolveMacrosResult,
} from "@/lib/kaios/nutrition/types";

export interface NutritionDataProvider {
  /**
   * Look up composition from catalog / external sources.
   * Returns null when no match — callers must not invent tables.
   */
  lookupComposition(
    observation: FoodObservation,
  ): Promise<FoodComposition | null>;

  /**
   * Resolve macros for an observation.
   * - catalog/external composition → provenance catalog|external (+ optional portion scale)
   * - no catalog → use observation macros only as model_estimate, or fail honestly
   */
  resolveMacros(observation: FoodObservation): Promise<ResolveMacrosResult>;
}

/** Helper: treat finite non-negative numbers as usable macros. */
export function hasObservationMacros(observation: FoodObservation): boolean {
  return (
    isFiniteMacro(observation.calories) &&
    isFiniteMacro(observation.protein) &&
    isFiniteMacro(observation.carbohydrates) &&
    isFiniteMacro(observation.fat)
  );
}

export function isFiniteMacro(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/** Build MacroResult from observation fields tagged as model_estimate. */
export function macrosFromObservationEstimate(
  observation: FoodObservation,
): MacroResult | null {
  if (!hasObservationMacros(observation)) return null;
  return {
    calories: observation.calories!,
    protein: observation.protein!,
    carbohydrates: observation.carbohydrates!,
    fat: observation.fat!,
    provenance: "model_estimate",
    note: "Model-side estimate only — not a verified catalog/DB value.",
  };
}
