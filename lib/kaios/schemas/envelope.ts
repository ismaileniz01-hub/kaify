import { z } from "zod";

/**
 * KAIOS response envelopes — Zod contracts for structured coach output.
 * Capsules instruct models toward these shapes; parsers enforce them.
 */

export const SCHEMA_VERSION = "kaios.envelope.v1" as const;

export const kaiosCoachSchema = z.enum([
  "alex",
  "maya",
  "leo",
  "kai",
  "council",
]);
export type KaiosEnvelopeCoach = z.infer<typeof kaiosCoachSchema>;

export const nutritionProvenanceSchema = z.enum([
  "catalog",
  "external",
  "model_estimate",
]);
export type NutritionProvenance = z.infer<typeof nutritionProvenanceSchema>;

/** Shared envelope base: required identity + message; optional structured slots. */
export const baseEnvelopeSchema = z.object({
  schema_version: z.string().min(1),
  coach: kaiosCoachSchema,
  message: z.string().min(1),
  intent: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  actions: z.array(z.unknown()).optional(),
  ui: z.record(z.string(), z.unknown()).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});
export type BaseEnvelope = z.infer<typeof baseEnvelopeSchema>;

export const casualCoachResponseSchema = baseEnvelopeSchema.extend({
  intent: z.literal("casual").optional().default("casual"),
});
export type CasualCoachResponse = z.infer<typeof casualCoachResponseSchema>;

export const trainingRecommendationResponseSchema = baseEnvelopeSchema.extend({
  coach: z.literal("alex"),
  intent: z.literal("training_recommendation").optional(),
  data: z
    .object({
      exercise_id: z.string().optional(),
      alternate_exercise_ids: z.array(z.string()).optional(),
      sets: z.number().optional(),
      reps: z.union([z.number(), z.string()]).optional(),
      rir: z.number().optional(),
      notes: z.string().optional(),
    })
    .passthrough()
    .optional(),
});
export type TrainingRecommendationResponse = z.infer<
  typeof trainingRecommendationResponseSchema
>;

export const mealAnalysisResponseSchema = baseEnvelopeSchema.extend({
  coach: z.literal("maya"),
  intent: z.literal("meal_analysis").optional(),
  data: z
    .object({
      calories: z.number(),
      protein: z.number(),
      carbohydrates: z.number(),
      fat: z.number(),
      provenance: nutritionProvenanceSchema,
    })
    .passthrough(),
});
export type MealAnalysisResponse = z.infer<typeof mealAnalysisResponseSchema>;

export const physiqueAnalysisResponseSchema = baseEnvelopeSchema.extend({
  coach: z.literal("leo"),
  intent: z.literal("physique_analysis").optional(),
  data: z
    .object({
      overall: z.number(),
      body_parts: z.record(z.string(), z.number()),
      trend: z.string().optional(),
      priority: z.string().optional(),
    })
    .passthrough(),
});
export type PhysiqueAnalysisResponse = z.infer<
  typeof physiqueAnalysisResponseSchema
>;

export const councilSpeakerSchema = z.object({
  coach: z.enum(["alex", "maya", "leo", "kai"]),
  message: z.string().min(1),
});
export type CouncilSpeaker = z.infer<typeof councilSpeakerSchema>;

export const councilTurnResponseSchema = baseEnvelopeSchema.extend({
  coach: z.literal("council"),
  intent: z.literal("council_turn").optional(),
  data: z
    .object({
      speakers: z.array(councilSpeakerSchema).min(1),
      await_user: z.boolean(),
    })
    .passthrough(),
});
export type CouncilTurnResponse = z.infer<typeof councilTurnResponseSchema>;

export const councilDecisionResponseSchema = baseEnvelopeSchema.extend({
  coach: z.literal("council"),
  intent: z.literal("council_decision").optional(),
  data: z
    .object({
      decision: z.string().min(1),
      contributors: z.array(z.enum(["alex", "maya", "leo", "kai"])).optional(),
      await_user: z.boolean().optional(),
    })
    .passthrough(),
});
export type CouncilDecisionResponse = z.infer<
  typeof councilDecisionResponseSchema
>;

export const toolActionResponseSchema = baseEnvelopeSchema.extend({
  intent: z.literal("tool_action").optional(),
  actions: z
    .array(
      z.object({
        type: z.string().min(1),
        payload: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .min(1),
});
export type ToolActionResponse = z.infer<typeof toolActionResponseSchema>;

export type ParseKaiosResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: z.ZodError };

function wrapParse<T>(
  result: z.SafeParseReturnType<unknown, T>,
): ParseKaiosResult<T> {
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, error: result.error };
}

export function parseBaseEnvelope(
  input: unknown,
): ParseKaiosResult<BaseEnvelope> {
  return wrapParse(baseEnvelopeSchema.safeParse(input));
}

export function parseCasualCoachResponse(
  input: unknown,
): ParseKaiosResult<CasualCoachResponse> {
  return wrapParse(casualCoachResponseSchema.safeParse(input));
}

export function parseTrainingRecommendationResponse(
  input: unknown,
): ParseKaiosResult<TrainingRecommendationResponse> {
  return wrapParse(trainingRecommendationResponseSchema.safeParse(input));
}

export function parseMealAnalysisResponse(
  input: unknown,
): ParseKaiosResult<MealAnalysisResponse> {
  return wrapParse(mealAnalysisResponseSchema.safeParse(input));
}

export function parsePhysiqueAnalysisResponse(
  input: unknown,
): ParseKaiosResult<PhysiqueAnalysisResponse> {
  return wrapParse(physiqueAnalysisResponseSchema.safeParse(input));
}

export function parseCouncilTurnResponse(
  input: unknown,
): ParseKaiosResult<CouncilTurnResponse> {
  return wrapParse(councilTurnResponseSchema.safeParse(input));
}

export function parseCouncilDecisionResponse(
  input: unknown,
): ParseKaiosResult<CouncilDecisionResponse> {
  return wrapParse(councilDecisionResponseSchema.safeParse(input));
}

export function parseToolActionResponse(
  input: unknown,
): ParseKaiosResult<ToolActionResponse> {
  return wrapParse(toolActionResponseSchema.safeParse(input));
}

/** Best-effort: validate shared base fields; use typed parsers for strict shapes. */
export function parseKaiosEnvelope(
  input: unknown,
): ParseKaiosResult<BaseEnvelope> {
  return parseBaseEnvelope(input);
}
