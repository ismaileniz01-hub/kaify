import { z } from "zod";

/**
 * Technical analysis contract (Gemini output) + image input validation.
 *
 * Gemini returns ONLY JSON matching `technicalAnalysisSchema`. Only VISIBLE
 * muscle groups are scored; non-visible groups are omitted entirely.
 */

export const MUSCLE_GROUPS = [
  "chests",
  "shoulders",
  "biceps",
  "triceps",
  "core",
  "back",
  "upper_legs",
  "calves",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

const muscleGroupSet = new Set<string>(MUSCLE_GROUPS);

export const muscleGroupSchema = z.enum(MUSCLE_GROUPS);

export const scoreSchema = z.number().min(0).max(100);

export const foodAnalysisSchema = z.object({
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carb: z.number().nonnegative(),
  fat: z.number().nonnegative(),
});

export type FoodAnalysis = z.infer<typeof foodAnalysisSchema>;

export const technicalAnalysisSchema = z.object({
  // Tolerate LLM drift: models sometimes emit non-muscle keys (e.g. food
  // returns "protein_quality") or invalid muscle names. Drop unknown/invalid
  // entries instead of rejecting the whole response so a good analysis with a
  // stray score key still succeeds.
  visible_muscles: z
    .array(z.string())
    .default([])
    .transform((arr) => arr.filter((m): m is MuscleGroup => muscleGroupSet.has(m))),
  scores: z
    .record(z.string(), z.unknown())
    .default({})
    .transform((obj) => {
      const filtered: MuscleScores = {};
      for (const [key, value] of Object.entries(obj)) {
        if (muscleGroupSet.has(key) && typeof value === "number") {
          const clamped = Math.min(100, Math.max(0, value));
          filtered[key as MuscleGroup] = clamped;
        }
      }
      return filtered;
    }),
  overall_score: scoreSchema.default(0),
  food_analysis: foodAnalysisSchema.nullable().default(null),
});

export type TechnicalAnalysis = z.infer<typeof technicalAnalysisSchema>;

/** Convenience type for muscle score maps (only visible groups present). */
export type MuscleScores = Partial<Record<MuscleGroup, number>>;

// ---------------------------------------------------------------------------
// Pre-analysis image quality gate (Gemini output)
// ---------------------------------------------------------------------------

export const imageQualitySchema = z.object({
  score: z.number().min(1).max(10),
  issues: z.array(z.string()).default([]),
  tips: z.array(z.string()).default([]),
});

export type ImageQuality = z.infer<typeof imageQualitySchema>;

// ---------------------------------------------------------------------------
// Route input
// ---------------------------------------------------------------------------

export const ANALYSIS_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AnalysisMimeType = (typeof ANALYSIS_MIME_TYPES)[number];

export const analyzeImageInputSchema = z.object({
  /** Base64-encoded image data (no data URL prefix). */
  imageBase64: z
    .string()
    .min(32, "Image data is required")
    .max(12_000_000, "Image is too large (max ~9MB)"),
  mimeType: z.enum(ANALYSIS_MIME_TYPES),
  note: z.string().trim().max(500, "Note too long").optional().default(""),
});

export type AnalyzeImageInput = z.infer<typeof analyzeImageInputSchema>;
