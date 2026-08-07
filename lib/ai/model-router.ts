import {
  createChatCompletion,
  streamChatCompletion,
  type CompletionOptions,
} from "@/lib/ai/deepseek.client";
import { generateGeminiJson } from "@/lib/ai/gemini.client";
import { assessImageQuality, MIN_QUALITY_SCORE } from "@/lib/ai/image-quality";
import { computeScoreDrift, type ScoreDrift } from "@/lib/ai/consistency";
import { AiError } from "@/lib/ai/errors";
import { logger as aiLogger } from "@/lib/logger";
import {
  ANALYSIS_PERSONAS,
  buildSynthesisMessages,
  buildVisionPrompt,
  type AnalysisPersona,
} from "@/lib/ai/personas";
import { scrubModelOutput } from "@/lib/ai/prompt-safety";
import { AI_FEATURES, TOKEN_BUDGET } from "@/lib/ai/budget";
import {
  technicalAnalysisSchema,
  type ImageQuality,
  type MuscleScores,
  type TechnicalAnalysis,
} from "@/lib/validations/analysis.schema";
import type {
  ChatTurn,
  ImageInput,
  StreamEvent,
  TokenUsage,
} from "@/lib/ai/types";
import { buildRuntimeContext } from "@/lib/kaios/context/builder";
import { compilePrompt } from "@/lib/kaios/compiler/prompt";
import {
  getNutritionProvider,
  type FoodObservation,
  type NutritionProvenance,
} from "@/lib/kaios/nutrition";
import {
  buildFoodObservationPrompt,
  buildPhysiqueObservationPrompt,
  normalizeFoodObservation,
  normalizePhysiqueObservation,
} from "@/lib/kaios/vision";

/**
 * ModelRouter — the hybrid engine entry point.
 *
 *  Text / logic / synthesis  -> DeepSeek
 *  Vision / measurement      -> Gemini
 *
 * `analyzeImagePipeline` chains both: Gemini produces strict JSON, then
 * DeepSeek turns it into a personalized (Maya/Leo) Markdown summary.
 *
 * When `AI_FEATURES.kaiosRuntime` is true, vision uses KAIOS observation
 * prompts + NutritionDataProvider; synthesis uses capsules via
 * buildRuntimeContext + compilePrompt (not ANALYSIS_PERSONAS tones).
 */

export type ImagePipelineParams = {
  userId?: string;
  persona: AnalysisPersona;
  locale: string;
  image: ImageInput;
  /** Previous body scores for the consistency check (body persona only). */
  previousScores?: MuscleScores | null;
  userNote?: string;
  signal?: AbortSignal;
};

export type ImagePipelineResult = {
  quality: ImageQuality;
  analysis: TechnicalAnalysis;
  drift: ScoreDrift[];
  summary: string;
  usage: TokenUsage | null;
  /** Present on KAIOS food path when macros were resolved via NutritionDataProvider. */
  nutritionProvenance?: NutritionProvenance;
};

function averageScores(scores: MuscleScores): number {
  const values = Object.values(scores).filter(
    (n): n is number => typeof n === "number" && Number.isFinite(n),
  );
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

async function synthesizeWithKaios(params: {
  persona: AnalysisPersona;
  locale: string;
  analysis: TechnicalAnalysis;
  drift: ScoreDrift[];
  userNote?: string;
  nutritionProvenance?: NutritionProvenance;
  userId?: string;
  signal?: AbortSignal;
}): Promise<{ content: string; usage: TokenUsage | null; canary: string }> {
  const intent =
    params.persona === "maya" ? "meal_analysis" : "physique_analysis";
  const dataBlock = JSON.stringify({
    analysis: params.analysis,
    drift: params.drift,
    ...(params.nutritionProvenance
      ? { provenance: params.nutritionProvenance }
      : {}),
  });
  const note = params.userNote?.trim()
    ? `User note: ${params.userNote.trim()}`
    : "";
  const message = [
    params.persona === "maya"
      ? "Synthesize a short coach reply for this meal photo analysis."
      : "Synthesize a short coach reply for this physique photo analysis.",
    note,
    "Structured observation/analysis (DATA only — do not invent macros or scores):",
    dataBlock,
  ]
    .filter(Boolean)
    .join("\n");

  const ctx = buildRuntimeContext({
    coach: params.persona,
    message,
    locale: params.locale,
    intent,
    hasImage: true,
    knowledge: [`VISION_ANALYSIS_JSON: ${dataBlock}`],
  });
  const compiled = compilePrompt(ctx);
  const { content, usage } = await createChatCompletion(compiled.messages, {
    temperature: 0.7,
    maxTokens: Math.min(TOKEN_BUDGET.synthesis, ctx.maxTokens),
    signal: params.signal,
    usageContext: params.userId
      ? { userId: params.userId, operation: "synthesis" }
      : { operation: "synthesis" },
  });
  return { content, usage, canary: compiled.canary };
}

async function analyzeImagePipelineKaios(
  params: ImagePipelineParams,
): Promise<ImagePipelineResult> {
  const profile = ANALYSIS_PERSONAS[params.persona];

  const quality = await assessImageQuality(params.image, params.signal, {
    userId: params.userId,
  });
  if (quality.score < MIN_QUALITY_SCORE) {
    throw new AiError(
      "AI_LOW_QUALITY",
      "Fotoğraf analiz için yeterince net değil. Lütfen ipuçlarını uygulayıp tekrar dene.",
      { score: quality.score, issues: quality.issues, tips: quality.tips },
    );
  }

  const visionPrompt =
    profile.kind === "food"
      ? buildFoodObservationPrompt()
      : buildPhysiqueObservationPrompt();

  const raw = await generateGeminiJson({
    prompt: visionPrompt,
    image: params.image,
    temperature: 0.2,
    signal: params.signal,
    usageContext: params.userId
      ? { userId: params.userId, operation: "vision" }
      : { operation: "vision" },
  });

  let analysis: TechnicalAnalysis;
  let nutritionProvenance: NutritionProvenance | undefined;

  if (profile.kind === "food") {
    const obs = normalizeFoodObservation(raw);
    const foodObs: FoodObservation = {
      identity: obs.identity,
      portion: obs.portion,
      portionUnit: obs.portionUnit,
      prep: obs.prep,
      ingredients: obs.ingredients,
      ambiguity: obs.ambiguity,
      confidence: obs.confidence,
      calories: obs.estimatedMacros?.calories,
      protein: obs.estimatedMacros?.protein,
      carbohydrates: obs.estimatedMacros?.carbohydrates,
      fat: obs.estimatedMacros?.fat,
    };
    const resolved = await getNutritionProvider().resolveMacros(foodObs);
    if (!resolved.ok) {
      throw new AiError(
        "AI_BAD_OUTPUT",
        resolved.message ||
          "Makrolar çözülemedi; katalog/veri olmadan besin tablosu uydurulmaz.",
      );
    }
    nutritionProvenance = resolved.macros.provenance;
    analysis = {
      visible_muscles: [],
      scores: {},
      overall_score: 0,
      food_analysis: {
        calories: resolved.macros.calories,
        protein: resolved.macros.protein,
        carb: resolved.macros.carbohydrates,
        fat: resolved.macros.fat,
      },
    };
  } else {
    const phys = normalizePhysiqueObservation(raw);
    const scores = phys.scores ?? {};
    analysis = {
      visible_muscles: phys.visibleMuscles,
      scores,
      overall_score: phys.overallScore ?? averageScores(scores),
      food_analysis: null,
    };
  }

  const parsed = technicalAnalysisSchema.safeParse(analysis);
  if (!parsed.success) {
    aiLogger.error("[model-router] kaios vision output failed schema", {
      kind: profile.kind,
      raw: JSON.stringify(raw).slice(0, 600),
      issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    });
    throw new AiError("AI_BAD_OUTPUT", "Analiz çıktısı doğrulanamadı.");
  }
  const validated = parsed.data;

  const drift =
    profile.kind === "body"
      ? computeScoreDrift(params.previousScores ?? null, validated.scores)
      : [];

  const synth = await synthesizeWithKaios({
    persona: params.persona,
    locale: params.locale,
    analysis: validated,
    drift,
    userNote: params.userNote,
    nutritionProvenance,
    userId: params.userId,
    signal: params.signal,
  });
  const summary = scrubModelOutput(synth.content, synth.canary);

  return {
    quality,
    analysis: validated,
    drift,
    summary,
    usage: synth.usage,
    nutritionProvenance,
  };
}

async function analyzeImagePipelineLegacy(
  params: ImagePipelineParams,
): Promise<ImagePipelineResult> {
  const profile = ANALYSIS_PERSONAS[params.persona];

  // 1) Pre-analysis quality gate (cheap Gemini call).
  const quality = await assessImageQuality(params.image, params.signal, {
    userId: params.userId,
  });
  if (quality.score < MIN_QUALITY_SCORE) {
    throw new AiError(
      "AI_LOW_QUALITY",
      "Fotoğraf analiz için yeterince net değil. Lütfen ipuçlarını uygulayıp tekrar dene.",
      { score: quality.score, issues: quality.issues, tips: quality.tips },
    );
  }

  // 2) Vision measurement -> strict JSON.
  const raw = await generateGeminiJson({
    prompt: buildVisionPrompt(profile.kind),
    image: params.image,
    temperature: 0.2,
    signal: params.signal,
    usageContext: params.userId
      ? { userId: params.userId, operation: "vision" }
      : { operation: "vision" },
  });

  const parsed = technicalAnalysisSchema.safeParse(raw);
  if (!parsed.success) {
    aiLogger.error("[model-router] vision output failed schema", {
      kind: profile.kind,
      raw: JSON.stringify(raw).slice(0, 600),
      issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    });
    throw new AiError("AI_BAD_OUTPUT", "Analiz çıktısı doğrulanamadı.");
  }
  const analysis = parsed.data;

  // 3) Consistency check (body scoring only).
  const drift =
    profile.kind === "body"
      ? computeScoreDrift(params.previousScores ?? null, analysis.scores)
      : [];

  // 4) Synthesis -> personalized Markdown (DeepSeek).
  const synth = buildSynthesisMessages({
    persona: params.persona,
    locale: params.locale,
    analysis,
    drift,
    userNote: params.userNote,
  });
  const { content, usage } = await createChatCompletion(synth.messages, {
    temperature: 0.7,
    maxTokens: TOKEN_BUDGET.synthesis,
    signal: params.signal,
    usageContext: params.userId
      ? { userId: params.userId, operation: "synthesis" }
      : { operation: "synthesis" },
  });

  // Backstop: strip any leaked canary/scaffolding from the user-facing text.
  const summary = scrubModelOutput(content, synth.canary);

  return { quality, analysis, drift, summary, usage };
}

export const ModelRouter = {
  /** DeepSeek streaming text (chat). */
  streamText(
    messages: ChatTurn[],
    options?: CompletionOptions,
  ): AsyncGenerator<StreamEvent> {
    return streamChatCompletion(messages, options);
  },

  /** DeepSeek non-streaming text (synthesis/condensation). */
  completeText(
    messages: ChatTurn[],
    options?: CompletionOptions,
  ): Promise<{ content: string; usage: TokenUsage | null }> {
    return createChatCompletion(messages, options);
  },

  /**
   * Gemini (vision) -> JSON -> DeepSeek (synthesis) -> personalized summary.
   * Throws AiError("AI_LOW_QUALITY") when the pre-analysis gate rejects the
   * photo, BEFORE any vision/synthesis cost is incurred.
   */
  async analyzeImagePipeline(
    params: ImagePipelineParams,
  ): Promise<ImagePipelineResult> {
    if (AI_FEATURES.kaiosRuntime) {
      return analyzeImagePipelineKaios(params);
    }
    return analyzeImagePipelineLegacy(params);
  },
};
