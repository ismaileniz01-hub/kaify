import {
  createChatCompletion,
  streamChatCompletion,
  type CompletionOptions,
} from "@/lib/ai/deepseek.client";
import { generateGeminiJson } from "@/lib/ai/gemini.client";
import { MIN_QUALITY_SCORE, formatLowQualityUserMessage } from "@/lib/ai/image-quality";
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
import { scrubModelOutput, wrapUntrustedInput } from "@/lib/ai/prompt-safety";
import { isUsableCoachReply, sanitizeCoachVisibleText } from "@/lib/kaios/coach-retry";
import { TOKEN_BUDGET } from "@/lib/ai/budget";
import { resolveLocale } from "@/lib/i18n/dictionary";
import { buildReplyLanguageDirective } from "@/lib/i18n/reply-language-directive";
import { isReplyLanguageMismatch } from "@/lib/i18n/reply-language-guard";
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
  userState?: string;
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

    const visionRequest = {
      prompt: buildVisionPrompt(profile.kind, params.userNote),
      image: params.image,
      temperature: 0.2,
      signal: params.signal,
      usageContext: params.userId
        ? { userId: params.userId, operation: "vision" as const }
        : { operation: "vision" as const },
    };

    let geminiCalls = 1;
    let raw: unknown;
    try {
      raw = await generateGeminiJson(visionRequest);
    } catch (error) {
      if (
        !(error instanceof AiError) ||
        (error.code !== "AI_BAD_OUTPUT" && error.code !== "AI_UPSTREAM")
      ) {
        throw error;
      }
      aiLogger.warn("[model-router] vision json retry after provider failure", {
        code: error.code,
        kind: profile.kind,
      });
      raw = await generateGeminiJson({
        ...visionRequest,
        thinkingLevel: "LOW",
      });
      geminiCalls = 2;
    }

    let interpreted = interpretVisionEnvelope(raw, MIN_QUALITY_SCORE);
    if (interpreted.status === "INVALID_PROVIDER_OUTPUT" && geminiCalls < 2) {
      aiLogger.warn("[model-router] vision envelope invalid; retrying", {
        kind: profile.kind,
        raw: JSON.stringify(raw).slice(0, 600),
      });
      raw = await generateGeminiJson({
        ...visionRequest,
        thinkingLevel: "LOW",
      });
      geminiCalls = 2;
      interpreted = interpretVisionEnvelope(raw, MIN_QUALITY_SCORE);
    }

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
        formatLowQualityUserMessage(params.locale, interpreted.quality),
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
      userState: params.userState,
    });
    const first = await createChatCompletion(synth.messages, {
      temperature: 0.7,
      maxTokens: TOKEN_BUDGET.synthesis,
      signal: params.signal,
      usageContext: params.userId
        ? { userId: params.userId, operation: "synthesis" }
        : { operation: "synthesis" },
    });

    let rawSummary = scrubModelOutput(first.content, synth.canary);
    let usage = first.usage;
    let deepseekCalls = 1;
    if (isReplyLanguageMismatch(rawSummary, params.locale)) {
      const originalSummary = rawSummary;
      try {
        const retry = await createChatCompletion(
          [
            {
              role: "system",
              content: [
                buildReplyLanguageDirective(resolveLocale(params.locale)),
                "Rewrite the supplied coach reply faithfully in the mandatory language. Preserve numbers and safety meaning. Return only the rewritten reply.",
              ].join("\n\n"),
            },
            {
              role: "user",
              content: wrapUntrustedInput("COACH_REPLY_TO_REWRITE", rawSummary),
            },
          ],
          {
            temperature: 0.2,
            maxTokens: TOKEN_BUDGET.synthesis,
            signal: params.signal,
            usageContext: params.userId
              ? { userId: params.userId, operation: "synthesis" }
              : { operation: "synthesis" },
          },
        );
        deepseekCalls += 1;
        rawSummary = retry.content;
        if (usage && retry.usage) {
          usage = {
            prompt_tokens: usage.prompt_tokens + retry.usage.prompt_tokens,
            completion_tokens:
              usage.completion_tokens + retry.usage.completion_tokens,
            total_tokens: usage.total_tokens + retry.usage.total_tokens,
          };
        } else {
          usage = retry.usage ?? usage;
        }
      } catch (error) {
        aiLogger.warn("[model-router] photo language rewrite failed; keeping original", {
          error: error instanceof Error ? error.message : "unknown",
        });
        rawSummary = originalSummary;
      }
      if (
        isReplyLanguageMismatch(rawSummary, params.locale) &&
        isUsableCoachReply(originalSummary)
      ) {
        rawSummary = originalSummary;
      }
    }

    const summary = sanitizeCoachVisibleText(
      rawSummary,
      params.locale,
      params.persona,
    );

    return {
      quality,
      analysis,
      drift,
      summary,
      usage,
      geminiCalls,
      deepseekCalls,
    };
  },
};
