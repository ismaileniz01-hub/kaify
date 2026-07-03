import {
  createChatCompletion,
  streamChatCompletion,
  type CompletionOptions,
} from "@/lib/ai/deepseek.client";
import { generateGeminiJson } from "@/lib/ai/gemini.client";
import { assessImageQuality, MIN_QUALITY_SCORE } from "@/lib/ai/image-quality";
import { computeScoreDrift, type ScoreDrift } from "@/lib/ai/consistency";
import { AiError } from "@/lib/ai/errors";
import {
  ANALYSIS_PERSONAS,
  buildSynthesisMessages,
  buildVisionPrompt,
  type AnalysisPersona,
} from "@/lib/ai/personas";
import { scrubModelOutput } from "@/lib/ai/prompt-safety";
import { TOKEN_BUDGET } from "@/lib/ai/budget";
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

/**
 * ModelRouter — the hybrid engine entry point.
 *
 *  Text / logic / synthesis  -> DeepSeek
 *  Vision / measurement      -> Gemini
 *
 * `analyzeImagePipeline` chains both: Gemini produces strict JSON, then
 * DeepSeek turns it into a personalized (Maya/Leo) Markdown summary.
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
};

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
  },
};
