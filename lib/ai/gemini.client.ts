import { getGeminiConfig } from "@/lib/ai/env";
import { AiError } from "@/lib/ai/errors";
import { TOKEN_BUDGET } from "@/lib/ai/budget";
import { extractFirstJsonObjectLenient } from "@/lib/ai/extract-json";
import { logger as geminiLogger } from "@/lib/logger";
import {
  gemini25ThinkingBudget,
  isGemini25FlashModel,
  isGemini3Model,
  type GeminiThinkingLevel,
} from "@/lib/ai/models";
import { resilient, classifyStatus, UpstreamHttpError } from "@/lib/resilience";
import type { ImageInput } from "@/lib/ai/types";
import type { TokenUsage } from "@/lib/ai/types";
import type { UsageContext } from "@/lib/ai/usage-ledger";
import { geminiEstimatedUsage, recordAiUsage } from "@/lib/ai/usage-ledger";

/**
 * Gemini client (Generative Language API).
 *
 * Role in the hybrid engine: ALL vision/measurement work — muscle-group
 * scoring and food macro analysis. Output is ALWAYS strict JSON (token saving),
 * enforced via `responseMimeType: application/json`. Callers validate the
 * parsed object with a Zod schema before use.
 */

const DEFAULT_TIMEOUT_MS = 60_000;
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

type GeminiPart = { text?: string; thought?: boolean };
type GeminiCandidate = {
  content?: { parts?: GeminiPart[] };
  finishReason?: string;
};
type GeminiUsageMetadata = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
  thoughtsTokenCount?: number;
};

type GeminiResponse = {
  candidates?: GeminiCandidate[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: GeminiUsageMetadata;
};

/**
 * Visible answer text only — never concatenate thought/summary parts into the
 * JSON payload (thinking models return mixed parts; joining them breaks
 * Maya/Leo photo analysis with AI_BAD_OUTPUT).
 */
export function extractGeminiAnswerText(
  parts: GeminiPart[] | undefined,
): string {
  if (!parts?.length) return "";
  const hasThoughtFlag = parts.some((part) => part.thought === true);
  if (hasThoughtFlag) {
    return parts
      .filter((part) => !part.thought)
      .map((part) => part.text ?? "")
      .join("")
      .trim();
  }
  if (parts.length === 1) return (parts[0]?.text ?? "").trim();
  for (const part of parts) {
    const text = (part.text ?? "").trim();
    if (text.startsWith("{") || text.startsWith("```")) return text;
  }
  return parts
    .map((part) => part.text ?? "")
    .join("")
    .trim();
}

/** REST generateContent config: Gemini 3 uses thinkingLevel; 2.5 Flash uses thinkingBudget. */
export function buildGeminiGenerationConfig(
  model: string,
  options?: {
    temperature?: number;
    thinkingLevel?: GeminiThinkingLevel;
    maxOutputTokens?: number;
  },
): Record<string, unknown> {
  const generationConfig: Record<string, unknown> = {
    responseMimeType: "application/json",
    // Thinking tokens count against this budget. Without headroom, Gemini
    // returns empty candidates (finishReason MAX_TOKENS) and photo analysis fails.
    maxOutputTokens: options?.maxOutputTokens ?? TOKEN_BUDGET.visionJson,
  };
  const thinkingLevel = options?.thinkingLevel ?? "MEDIUM";
  if (isGemini3Model(model)) {
    generationConfig.thinkingConfig = {
      thinkingLevel: thinkingLevel.toLowerCase(),
    };
    return generationConfig;
  }
  generationConfig.temperature = options?.temperature ?? 0.2;
  if (isGemini25FlashModel(model)) {
    generationConfig.thinkingConfig = {
      thinkingBudget: gemini25ThinkingBudget(thinkingLevel),
    };
  }
  return generationConfig;
}

function usageFromGemini(meta: GeminiUsageMetadata | undefined): TokenUsage | null {
  if (!meta) return null;
  const prompt = meta.promptTokenCount ?? 0;
  const completion =
    (meta.candidatesTokenCount ?? 0) + (meta.thoughtsTokenCount ?? 0);
  const total = meta.totalTokenCount ?? prompt + completion;
  if (total <= 0) return null;
  return {
    prompt_tokens: prompt,
    completion_tokens: completion,
    total_tokens: total,
  };
}

export type GenerateJsonParams = {
  /** Instruction describing the task and the exact JSON shape to return. */
  prompt: string;
  /** Optional system-level instruction. */
  systemInstruction?: string;
  /** Optional image for vision tasks. */
  image?: ImageInput;
  temperature?: number;
  /** Override thinking depth; defaults to env/config (MEDIUM). */
  thinkingLevel?: GeminiThinkingLevel;
  signal?: AbortSignal;
  usageContext?: UsageContext;
};

/** Parse Gemini JSON text, salvaging fenced / prose-wrapped objects. */
export function parseGeminiJsonText(text: string): unknown {
  const stripped = stripCodeFences(text);
  try {
    return JSON.parse(stripped) as unknown;
  } catch {
    const salvaged = extractFirstJsonObjectLenient(stripped);
    if (salvaged.ok) return salvaged.value;
    throw new AiError("AI_BAD_OUTPUT", "Gemini did not return valid JSON");
  }
}

function withTimeout(
  external: AbortSignal | undefined,
  timeoutMs: number,
): { signal: AbortSignal; cancel: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  if (external) {
    if (external.aborted) controller.abort();
    else external.addEventListener("abort", onAbort, { once: true });
  }
  return {
    signal: controller.signal,
    cancel: () => {
      clearTimeout(timer);
      if (external) external.removeEventListener("abort", onAbort);
    },
  };
}

/** Strips ```json fences the model may add despite JSON mime requests. */
function stripCodeFences(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("```")) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
  }
  return trimmed;
}

/**
 * Calls Gemini and returns the parsed JSON object as `unknown`.
 * The caller MUST validate the result with a Zod schema.
 */
export async function generateGeminiJson(
  params: GenerateJsonParams,
): Promise<unknown> {
  const config = getGeminiConfig();
  const { signal, cancel } = withTimeout(params.signal, DEFAULT_TIMEOUT_MS);

  const parts: Array<Record<string, unknown>> = [{ text: params.prompt }];
  if (params.image) {
    parts.push({
      inline_data: {
        mime_type: params.image.mimeType,
        data: params.image.base64,
      },
    });
  }

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts }],
    generationConfig: buildGeminiGenerationConfig(config.model, {
      temperature: params.temperature,
      thinkingLevel: params.thinkingLevel ?? config.thinkingLevel,
    }),
  };
  if (params.systemInstruction) {
    body.systemInstruction = { parts: [{ text: params.systemInstruction }] };
  }

  const url =
    `${GEMINI_BASE_URL}/models/${encodeURIComponent(config.model)}:generateContent`;

  let response: Response;
  try {
    response = await resilient(
      "gemini",
      async () => {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": config.apiKey,
          },
          body: JSON.stringify(body),
          signal,
        });
        if (!res.ok && classifyStatus(res.status).retryable) {
          throw new UpstreamHttpError(res.status, undefined, "gemini");
        }
        return res;
      },
      { retries: 2, signal: params.signal },
    );
  } catch (error) {
    cancel();
    throw error instanceof AiError
      ? error
      : error instanceof DOMException && error.name === "AbortError"
        ? new AiError("AI_TIMEOUT", "Gemini request timed out")
        : error instanceof UpstreamHttpError
          ? new AiError("AI_UPSTREAM", error.message)
          : new AiError("AI_UPSTREAM", "Gemini request failed");
  }

  try {
    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      geminiLogger.error("[gemini] http error", {
        status: response.status,
        body: errBody.slice(0, 400),
      });
      throw new AiError(
        "AI_UPSTREAM",
        `Gemini request failed with status ${response.status}`,
      );
    }

    const json = (await response.json()) as GeminiResponse;

    if (json.promptFeedback?.blockReason) {
      geminiLogger.error("[gemini] request blocked", {
        blockReason: json.promptFeedback.blockReason,
      });
      throw new AiError(
        "AI_BAD_OUTPUT",
        `Gemini blocked the request: ${json.promptFeedback.blockReason}`,
      );
    }

    const candidate = json.candidates?.[0];
    const text = extractGeminiAnswerText(candidate?.content?.parts);

    if (!text) {
      geminiLogger.error("[gemini] empty content", {
        finishReason: candidate?.finishReason ?? null,
        thoughtsTokenCount: json.usageMetadata?.thoughtsTokenCount ?? null,
        response: JSON.stringify(json).slice(0, 600),
      });
      if (candidate?.finishReason === "MAX_TOKENS") {
        throw new AiError(
          "AI_UPSTREAM",
          "Gemini exhausted the output budget before returning vision JSON",
        );
      }
      throw new AiError("AI_BAD_OUTPUT", "Gemini returned empty content");
    }

    try {
      return parseGeminiJsonText(text);
    } catch (error) {
      geminiLogger.error("[gemini] invalid JSON", {
        finishReason: candidate?.finishReason ?? null,
        text: text.slice(0, 600),
      });
      throw error instanceof AiError
        ? error
        : new AiError("AI_BAD_OUTPUT", "Gemini did not return valid JSON");
    } finally {
      if (params.usageContext) {
        const usage = usageFromGemini(json.usageMetadata);
        recordAiUsage({
          provider: "gemini",
          context: params.usageContext,
          usage,
          estimatedTotalTokens: usage
            ? undefined
            : geminiEstimatedUsage(
                params.prompt.length + (params.systemInstruction?.length ?? 0),
                Boolean(params.image),
              ).total_tokens,
          metadata:
            json.usageMetadata?.thoughtsTokenCount != null
              ? { thoughtsTokenCount: json.usageMetadata.thoughtsTokenCount }
              : undefined,
        });
      }
    }
  } finally {
    cancel();
  }
}
