import { getGeminiConfig } from "@/lib/ai/env";
import { AiError } from "@/lib/ai/errors";
import { logger as geminiLogger } from "@/lib/logger";
import { resilient, classifyStatus, UpstreamHttpError } from "@/lib/resilience";
import type { ImageInput } from "@/lib/ai/types";
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

const DEFAULT_TIMEOUT_MS = 45_000;
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

type GeminiPart = { text?: string };
type GeminiCandidate = { content?: { parts?: GeminiPart[] } };
type GeminiResponse = {
  candidates?: GeminiCandidate[];
  promptFeedback?: { blockReason?: string };
};

export type GenerateJsonParams = {
  /** Instruction describing the task and the exact JSON shape to return. */
  prompt: string;
  /** Optional system-level instruction. */
  systemInstruction?: string;
  /** Optional image for vision tasks. */
  image?: ImageInput;
  temperature?: number;
  signal?: AbortSignal;
  usageContext?: UsageContext;
};

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
    generationConfig: {
      temperature: params.temperature ?? 0.2,
      responseMimeType: "application/json",
    },
  };
  if (params.systemInstruction) {
    body.systemInstruction = { parts: [{ text: params.systemInstruction }] };
  }

  const url =
    `${GEMINI_BASE_URL}/models/${encodeURIComponent(config.model)}:generateContent` +
    `?key=${encodeURIComponent(config.apiKey)}`;

  let response: Response;
  try {
    response = await resilient(
      "gemini",
      async () => {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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

    const text = json.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();

    if (!text) {
      geminiLogger.error("[gemini] empty content", {
        response: JSON.stringify(json).slice(0, 600),
      });
      throw new AiError("AI_BAD_OUTPUT", "Gemini returned empty content");
    }

    try {
      return JSON.parse(stripCodeFences(text)) as unknown;
    } catch {
      geminiLogger.error("[gemini] invalid JSON", { text: text.slice(0, 600) });
      throw new AiError("AI_BAD_OUTPUT", "Gemini did not return valid JSON");
    } finally {
      if (params.usageContext) {
        recordAiUsage({
          provider: "gemini",
          context: params.usageContext,
          usage: null,
          estimatedTotalTokens: geminiEstimatedUsage(
            params.prompt.length + (params.systemInstruction?.length ?? 0),
            Boolean(params.image),
          ).total_tokens,
        });
      }
    }
  } finally {
    cancel();
  }
}
