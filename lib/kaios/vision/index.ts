/**
 * KAIOS vision observations — prompts + normalization for the new path.
 * Existing image-quality.ts / analysis.schema remain usable alongside.
 */

export type {
  FoodObservationSchema,
  ImageQualityObservation,
  PhysiqueObservation,
} from "@/lib/kaios/vision/types";

export {
  buildFoodObservationPrompt,
  buildPhysiqueObservationPrompt,
  buildImageQualityPrompt,
} from "@/lib/kaios/vision/prompts";

export {
  normalizeFoodObservation,
  normalizePhysiqueObservation,
  normalizeImageQualityObservation,
} from "@/lib/kaios/vision/normalize";
