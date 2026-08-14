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

/**
 * Coerces an LLM-provided number that may arrive as a string ("245",
 * "245 kcal"), null, or out of range. Falls back to `fallback` and clamps to
 * [min, max]. Keeps a single stray/garbage field from 500ing the whole
 * analysis response.
 */
function lenientNumber(min: number, max: number, fallback: number) {
  return z.preprocess((value) => {
    let n: number;
    if (typeof value === "number") n = value;
    else if (typeof value === "string") n = Number.parseFloat(value);
    else return fallback;
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }, z.number());
}

export const scoreSchema = lenientNumber(0, 100, 0);

export const foodAnalysisSchema = z.object({
  calories: lenientNumber(0, 100_000, 0),
  protein: lenientNumber(0, 100_000, 0),
  carb: lenientNumber(0, 100_000, 0),
  fat: lenientNumber(0, 100_000, 0),
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
  ambiguity: z
    .array(z.string())
    .optional()
    .default([])
    .transform((arr) => arr.filter((s) => s.trim().length > 0).slice(0, 8)),
});

export type TechnicalAnalysis = z.infer<typeof technicalAnalysisSchema>;

/** Convenience type for muscle score maps (only visible groups present). */
export type MuscleScores = Partial<Record<MuscleGroup, number>>;

// ---------------------------------------------------------------------------
// Pre-analysis image quality gate (Gemini output)
// ---------------------------------------------------------------------------

/** Tolerates non-array or mixed-type entries; keeps only non-empty strings. */
const stringListSchema = z.preprocess(
  (value) => (Array.isArray(value) ? value : []),
  z.array(z.unknown()).transform((arr) =>
    arr
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .slice(0, 10),
  ),
);

export const imageQualitySchema = z.object({
  // Fail closed: missing / NaN / wrong type / out-of-range must NOT become a
  // passing score. Only a finite 1–10 number is valid.
  score: z.preprocess((value) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const n = Number.parseFloat(value);
      if (Number.isFinite(n)) return n;
    }
    return undefined;
  }, z.number().min(1).max(10)),
  issues: stringListSchema,
  tips: stringListSchema,
});

export type ImageQuality = z.infer<typeof imageQualitySchema>;

export const visionEnvelopeSchema = z.object({
  quality: imageQualitySchema,
  observations: z.unknown().optional(),
});

export type VisionQualityStatus =
  | "VALID"
  | "INSUFFICIENT_QUALITY"
  | "INVALID_PROVIDER_OUTPUT";

export type InterpretedVisionEnvelope =
  | { status: "INVALID_PROVIDER_OUTPUT" }
  | {
      status: "INSUFFICIENT_QUALITY";
      quality: ImageQuality;
    }
  | {
      status: "VALID";
      quality: ImageQuality;
      analysis: TechnicalAnalysis;
    };

/**
 * Fail-closed interpreter for the combined Gemini quality+observation envelope.
 * Missing/NaN/OOR quality → INVALID_PROVIDER_OUTPUT (never a default passing score).
 * Finite low score → INSUFFICIENT_QUALITY.
 * Valid quality without parseable observations → INVALID_PROVIDER_OUTPUT.
 */
export function interpretVisionEnvelope(
  raw: unknown,
  minQualityScore: number,
): InterpretedVisionEnvelope {
  const envelope = visionEnvelopeSchema.safeParse(raw);
  if (!envelope.success) {
    return { status: "INVALID_PROVIDER_OUTPUT" };
  }
  const quality = envelope.data.quality;
  if (quality.score < minQualityScore) {
    return { status: "INSUFFICIENT_QUALITY", quality };
  }
  const observations = envelope.data.observations;
  if (
    observations == null ||
    typeof observations !== "object" ||
    Array.isArray(observations)
  ) {
    return { status: "INVALID_PROVIDER_OUTPUT" };
  }
  const analysis = technicalAnalysisSchema.safeParse(observations);
  if (!analysis.success) {
    return { status: "INVALID_PROVIDER_OUTPUT" };
  }
  return { status: "VALID", quality, analysis: analysis.data };
}

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
