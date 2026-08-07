/**
 * KAIOS vision observation types.
 * Gemini returns OBSERVATIONS — coaches (Maya/Leo) speak later in synthesis.
 */

import type { MuscleGroup } from "@/lib/validations/analysis.schema";

/** Schema-shaped food observation fields from vision. */
export type FoodObservationSchema = {
  identity?: string;
  portion?: string | number;
  portionUnit?: string;
  prep?: string;
  ingredients?: string[];
  ambiguity?: string[];
  confidence?: number;
  /**
   * Optional model-side macro estimates. Downstream NutritionDataProvider
   * MUST label these as provenance `model_estimate` — never catalog/external.
   */
  estimatedMacros?: {
    calories?: number;
    protein?: number;
    carbohydrates?: number;
    fat?: number;
  };
};

/** Physique observation — visible muscles + qualitative notes (scores via Leo eval). */
export type PhysiqueObservation = {
  visibleMuscles: MuscleGroup[];
  qualitativeNotes?: string[];
  postureNotes?: string[];
  ambiguity?: string[];
  confidence?: number;
  /** Optional scores if present; Leo eval step remains authoritative for UX. */
  scores?: Partial<Record<MuscleGroup, number>>;
  overallScore?: number;
};

export type ImageQualityObservation = {
  score: number;
  issues: string[];
  tips: string[];
};
