import { getDeepSeekConfig } from "@/lib/ai/env";
import { AiError } from "@/lib/ai/errors";
import { resilient, UpstreamHttpError } from "@/lib/resilience";
import type { ChatTurn, StreamEvent, TokenUsage } from "@/lib/ai/types";
import type { UsageContext } from "@/lib/ai/usage-ledger";
import { recordAiUsage } from "@/lib/ai/usage-ledger";

/**
 * DeepSeek client (OpenAI-compatible Chat Completions).
 *
 * Role in the hybrid engine: ALL logic, reasoning, economic analysis and
 * persona-based text synthesis (Markdown, human-friendly, motivating).
 *
 * Context caching: DeepSeek performs automatic server-side prefix caching, so
 * we keep the system prompt + memory as a stable leading message to maximize
 * cache hits and reduce token cost. No client-side cache key is required.
 */

const DEFAULT_TIMEOUT_MS = 60_000;

type DeepSeekChoiceDelta = {
  delta?: { content?: string | null };
  message?: { content?: string | null };
  finish_reason?: string | null;
};

type DeepSeekChunk = {
  choices?: DeepSeekChoiceDelta[];
  usage?: TokenUsage | null;
};

export type CompletionOptions = {
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  usageContext?: UsageContext;
};

function buildHeaders(apiKey: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
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

/** Maps a per-attempt failure to the right error, honoring caller aborts. */
function toAiError(error: unknown, externalSignal?: AbortSignal): AiError {
  if (error instanceof AiError) return error;
  if (error instanceof UpstreamHttpError) {
    return new AiError("AI_UPSTREAM", error.message);
  }
  if (error instanceof DOMException && error.name === "AbortError") {
    // A caller-initiated abort must NOT be retried; a per-attempt timeout may.
    return new AiError("AI_TIMEOUT", "DeepSeek request timed out");
  }
  void externalSignal;
  return new AiError("AI_UPSTREAM", "DeepSeek request failed");
}

/**
 * Non-streaming completion. Used for synthesis steps where we need the full
 * text before persisting (e.g. image-pipeline summary, memory condensation).
 *
 * Self-healing: each attempt gets a fresh timeout; transient timeouts and
 * retryable upstream statuses (502/503/504…) are retried with backoff and feed
 * the "deepseek" circuit breaker.
 */
export async function createChatCompletion(
  messages: ChatTurn[],
  options: CompletionOptions = {},
): Promise<{ content: string; usage: TokenUsage | null }> {
  const config = getDeepSeekConfig();

  return resilient(
    "deepseek",
    async () => {
      const { signal, cancel } = withTimeout(options.signal, DEFAULT_TIMEOUT_MS);
      try {
        const response = await fetch(`${config.baseUrl}/chat/completions`, {
          method: "POST",
          headers: buildHeaders(config.apiKey),
          body: JSON.stringify({
            model: config.model,
            messages,
            stream: false,
            temperature: options.temperature ?? 0.7,
            ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
          }),
          signal,
        });

        if (!response.ok) {
          // Let the taxonomy decide retryability from the status: 5xx/429 retry
          // and trip the breaker; 4xx propagate as a non-retryable failure.
          throw new UpstreamHttpError(
            response.status,
            `DeepSeek request failed with status ${response.status}`,
            "deepseek",
          );
        }

        const json = (await response.json()) as DeepSeekChunk;
        const content = json.choices?.[0]?.message?.content ?? "";
        if (!content) {
          throw new AiError("AI_BAD_OUTPUT", "DeepSeek returned empty content");
        }
        if (options.usageContext) {
          recordAiUsage({
            provider: "deepseek",
            context: options.usageContext,
            usage: json.usage ?? null,
          });
        }
        return { content, usage: json.usage ?? null };
      } finally {
        // Errors propagate raw so retry/circuit can classify them; the outer
        // `.catch` normalizes whatever survives into an AiError.
        cancel();
      }
    },
    { retries: 2, signal: options.signal },
  ).catch((error) => {
    throw toAiError(error, options.signal);
  });
}

/**
 * Streaming completion. Yields incremental `delta` events and a final `done`
 * event carrying token usage (when `stream_options.include_usage` is honored).
 */
export async function* streamChatCompletion(
  messages: ChatTurn[],
  options: CompletionOptions = {},
): AsyncGenerator<StreamEvent> {
  const config = getDeepSeekConfig();
  const { signal, cancel } = withTimeout(options.signal, DEFAULT_TIMEOUT_MS);

  // Connect phase is retryable: a transient 5xx/timeout before the first byte
  // is retried with backoff and feeds the "deepseek" breaker. Once the body is
  // streaming we no longer retry (partial output cannot be replayed).
  let response: Response;
  try {
    response = await resilient(
      "deepseek",
      async () => {
        const res = await fetch(`${config.baseUrl}/chat/completions`, {
          method: "POST",
          headers: buildHeaders(config.apiKey),
          body: JSON.stringify({
            model: config.model,
            messages,
            stream: true,
            stream_options: { include_usage: true },
            temperature: options.temperature ?? 0.7,
            ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
          }),
          signal,
        });
        if (!res.ok || !res.body) {
          throw new UpstreamHttpError(
            res.status,
            `DeepSeek stream failed with status ${res.status}`,
            "deepseek",
          );
        }
        return res;
      },
      { retries: 2, signal: options.signal },
    );
  } catch (error) {
    cancel();
    throw error instanceof AiError
      ? error
      : error instanceof DOMException && error.name === "AbortError"
        ? new AiError("AI_TIMEOUT", "DeepSeek request timed out")
        : error instanceof UpstreamHttpError
          ? new AiError("AI_UPSTREAM", error.message)
          : new AiError("AI_UPSTREAM", "DeepSeek request failed");
  }

  const body = response.body;
  if (!body) {
    cancel();
    throw new AiError("AI_UPSTREAM", "DeepSeek stream had no body");
  }
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let usage: TokenUsage | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || !line.startsWith("data:")) continue;

        const payload = line.slice(5).trim();
        if (payload === "[DONE]") continue;

        let chunk: DeepSeekChunk;
        try {
          chunk = JSON.parse(payload) as DeepSeekChunk;
        } catch {
          continue; // skip malformed/partial SSE frames
        }

        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) {
          yield { type: "delta", content: delta };
        }
        if (chunk.usage) {
          usage = chunk.usage;
        }
      }
    }
    yield { type: "done", usage };
    if (options.usageContext && usage) {
      recordAiUsage({
        provider: "deepseek",
        context: options.usageContext,
        usage,
      });
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new AiError("AI_TIMEOUT", "DeepSeek stream timed out");
    }
    throw new AiError("AI_UPSTREAM", "DeepSeek stream interrupted");
  } finally {
    cancel();
    reader.releaseLock();
  }
}
