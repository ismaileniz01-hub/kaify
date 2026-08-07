/**
 * Fallback NutritionDataProvider when no food catalog is configured.
 *
 * CRITICAL: does NOT invent kcal tables. If the observation carries macros,
 * they are returned with provenance `model_estimate`. Otherwise fails honestly.
 */

import {
  macrosFromObservationEstimate,
  type NutritionDataProvider,
} from "@/lib/kaios/nutrition/provider";
import type {
  FoodComposition,
  FoodObservation,
  ResolveMacrosResult,
} from "@/lib/kaios/nutrition/types";

export class ModelEstimateProvider implements NutritionDataProvider {
  async lookupComposition(
    _observation: FoodObservation,
  ): Promise<FoodComposition | null> {
    // No catalog configured — never invent composition rows.
    return null;
  }

  async resolveMacros(
    observation: FoodObservation,
  ): Promise<ResolveMacrosResult> {
    const macros = macrosFromObservationEstimate(observation);
    if (!macros) {
      return {
        ok: false,
        reason: "no_macros",
        message:
          "No catalog composition and observation has no usable macros; refusing to invent nutrient tables.",
      };
    }
    return { ok: true, macros };
  }
}

export function createModelEstimateProvider(): NutritionDataProvider {
  return new ModelEstimateProvider();
}
