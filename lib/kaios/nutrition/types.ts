/**
 * KAIOS nutrition types.
 *
 * Gemini / vision is an observation layer only. Composition ownership
 * lives on NutritionDataProvider. Provenance must never present
 * model_estimate as catalog/external verified values.
 */

export type NutritionProvenance = "catalog" | "external" | "model_estimate";

/** Observation of a food/meal — identity, portion, prep; macros optional estimates. */
export type FoodObservation = {
  identity?: string;
  portion?: string | number;
  portionUnit?: string;
  prep?: string;
  ingredients?: string[];
  ambiguity?: string[];
  confidence?: number;
  /** Optional model-side macro estimates — never treated as catalog truth alone. */
  calories?: number;
  protein?: number;
  carbohydrates?: number;
  fat?: number;
};

/** Per-item or per-100g composition from a trusted catalog / external source. */
export type FoodComposition = {
  id?: string;
  name?: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  /** Basis for deterministic portion scaling when present. */
  per?: "100g" | "serving";
  servingGrams?: number;
  source?: string;
};

/** Resolved macros with mandatory provenance. */
export type MacroResult = {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  provenance: NutritionProvenance;
  /** True only when composition came from catalog/external and portion math applied. */
  scaled?: boolean;
  compositionSource?: string;
  note?: string;
};

export type ResolveMacrosError = {
  ok: false;
  reason: "no_composition" | "no_macros" | "invalid_observation";
  message: string;
};

export type ResolveMacrosSuccess = {
  ok: true;
  macros: MacroResult;
};

export type ResolveMacrosResult = ResolveMacrosSuccess | ResolveMacrosError;
