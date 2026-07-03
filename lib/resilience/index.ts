import { logger } from "@/lib/logger";
import { classifyError } from "@/lib/resilience/error-taxonomy";
import { withRetry } from "@/lib/resilience/retry";
import { withCircuit, CircuitOpenError } from "@/lib/resilience/circuit";

export * from "@/lib/resilience/error-taxonomy";
export * from "@/lib/resilience/retry";
export * from "@/lib/resilience/circuit";

export type ResilientOptions<T> = {
  /** Max retries after the first attempt. Default 2. */
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Circuit threshold (consecutive availability failures). Default 3. */
  threshold?: number;
  /** Circuit cooldown before a half-open probe. Default 30s. */
  cooldownMs?: number;
  signal?: AbortSignal;
  /** Override retry decision. Default: taxonomy `retryable`. */
  isRetryable?: (error: unknown) => boolean;
  /**
   * Last-resort recovery when every attempt fails or the circuit is open.
   * Return a degraded-but-valid value (e.g. cached/stale data) here.
   */
  fallback?: (error: unknown) => Promise<T> | T;
};

/**
 * The self-healing entry point: retry (backoff+jitter) inside a circuit
 * breaker, with an optional fallback for graceful degradation.
 *
 *   resilient("deepseek", () => callProvider(), { fallback: () => cached })
 *
 * A single logical call = one circuit outcome (all internal retries collapse
 * into one success/failure), so the breaker reflects real dependency health.
 */
export async function resilient<T>(
  name: string,
  fn: (attempt: number) => Promise<T>,
  options: ResilientOptions<T> = {},
): Promise<T> {
  const isRetryable =
    options.isRetryable ?? ((e: unknown) => classifyError(e).retryable);

  try {
    return await withCircuit(
      name,
      () =>
        withRetry((attempt) => fn(attempt), {
          retries: options.retries,
          baseDelayMs: options.baseDelayMs,
          maxDelayMs: options.maxDelayMs,
          signal: options.signal,
          isRetryable,
          onRetry: ({ attempt, delayMs, error }) => {
            logger.warn("resilient.retry", {
              circuit: name,
              attempt,
              delayMs: Math.round(delayMs),
              category: classifyError(error).category,
            });
          },
        }),
      {
        threshold: options.threshold,
        cooldownMs: options.cooldownMs,
      },
    );
  } catch (error) {
    const open = error instanceof CircuitOpenError;
    if (options.fallback) {
      logger.warn("resilient.fallback", {
        circuit: name,
        open,
        category: classifyError(error).category,
      });
      return await options.fallback(error);
    }
    if (open) {
      logger.warn("resilient.circuit_open", { circuit: name });
    }
    throw error;
  }
}
