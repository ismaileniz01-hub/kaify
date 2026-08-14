import {
  createChatCompletion,
  streamChatCompletion,
  type CompletionOptions,
} from "@/lib/ai/deepseek.client";
import { generateGeminiJson } from "@/lib/ai/gemini.client";
import { MIN_QUALITY_SCORE } from "@/lib/ai/image-quality";
import { computeScoreDrift, type ScoreDrift } from "@/lib/ai/consistency";
import { AiError } from "@/lib/ai/errors";
import { aiCopy } from "@/lib/ai/ai-copy";
import { logger as aiLogger } from "@/lib/logger";
import {
  ANALYSIS_PERSONAS,
  buildSynthesisMessages,
  buildVisionPrompt,
  type AnalysisPersona,
} from "@/lib/ai/personas";
import { scrubModelOutput } from "@/lib/ai/prompt-safety";
import { TOKEN_BUDGET } from "@/lib/ai/budget";
import {
  interpretVisionEnvelope,
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
 * ModelRouter — hybrid engine.
 *
 *  Text / logic / synthesis  -> DeepSeek
 *  Vision observation        -> one Gemini structured call (quality + observations)
 */

export type ImagePipelineParams = {
  userId?: string;
  persona: AnalysisPersona;
  locale: string;
  image: ImageInput;
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
  geminiCalls: number;
  deepseekCalls: number;
};

export const ModelRouter = {
  streamText(
    messages: ChatTurn[],
    options?: CompletionOptions,
  ): AsyncGenerator<StreamEvent> {
    return streamChatCompletion(messages, options);
  },

  completeText(
    messages: ChatTurn[],
    options?: CompletionOptions,
  ): Promise<{ content: string; usage: TokenUsage | null }> {
    return createChatCompletion(messages, options);
  },

  /**
   * One Gemini vision envelope → fail-closed quality → DeepSeek coach synthesis.
   * Insufficient quality stops before DeepSeek.
   */
  async analyzeImagePipeline(
    params: ImagePipelineParams,
  ): Promise<ImagePipelineResult> {
    const profile = ANALYSIS_PERSONAS[params.persona];

    const raw = await generateGeminiJson({
      prompt: buildVisionPrompt(profile.kind),
      image: params.image,
      temperature: 0.2,
      signal: params.signal,
      usageContext: params.userId
        ? { userId: params.userId, operation: "vision" }
        : { operation: "vision" },
    });

    const interpreted = interpretVisionEnvelope(raw, MIN_QUALITY_SCORE);
    if (interpreted.status === "INVALID_PROVIDER_OUTPUT") {
      aiLogger.error("[model-router] combined vision envelope invalid", {
        kind: profile.kind,
        raw: JSON.stringify(raw).slice(0, 600),
      });
      throw new AiError("AI_BAD_OUTPUT", aiCopy(params.locale, "bad_analysis_output"));
    }
    if (interpreted.status === "INSUFFICIENT_QUALITY") {
      throw new AiError(
        "AI_LOW_QUALITY",
        aiCopy(params.locale, "low_quality_image"),
        {
          status: interpreted.status,
          score: interpreted.quality.score,
          issues: interpreted.quality.issues,
          tips: interpreted.quality.tips,
        },
      );
    }

    const { quality, analysis } = interpreted;

    const drift =
      profile.kind === "body"
        ? computeScoreDrift(params.previousScores ?? null, analysis.scores)
        : [];

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

    const summary = scrubModelOutput(content, synth.canary);

    return {
      quality,
      analysis,
      drift,
      summary,
      usage,
      geminiCalls: 1,
      deepseekCalls: 1,
    };
  },
};
