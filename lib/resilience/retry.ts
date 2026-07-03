import { classifyError } from "@/lib/resilience/error-taxonomy";

/**
 * Retry with exponential backoff + full jitter.
 *
 * Only retries errors the taxonomy marks retryable (transient / upstream /
 * rate_limit) by default. Aborts immediately if the caller's AbortSignal fires.
 */

export type RetryInfo = {
  attempt: number; // 1-based index of the retry about to happen
  delayMs: number;
  error: unknown;
};

export type RetryOptions = {
  /** Max retries AFTER the first attempt. Default 2 → up to 3 tries total. */
  retries?: number;
  baseDelayMs?: number; // default 200
  maxDelayMs?: number; // default 2000
  factor?: number; // default 2
  jitter?: boolean; // default true (full jitter)
  signal?: AbortSignal;
  isRetryable?: (error: unknown) => boolean;
  onRetry?: (info: RetryInfo) => void;
};

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (ms <= 0) return resolve();
    const timer = setTimeout(finish, ms);
    function finish() {
      clearTimeout(timer);
      signal?.removeEventListener("abort", finish);
      resolve();
    }
    signal?.addEventListener("abort", finish, { once: true });
  });
}

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const retries = options.retries ?? 2;
  const base = options.baseDelayMs ?? 200;
  const max = options.maxDelayMs ?? 2000;
  const factor = options.factor ?? 2;
  const jitter = options.jitter ?? true;
  const isRetryable =
    options.isRetryable ?? ((e: unknown) => classifyError(e).retryable);

  let attempt = 0;
  for (;;) {
    try {
      return await fn(attempt);
    } catch (error) {
      const canRetry =
        attempt < retries && !options.signal?.aborted && isRetryable(error);
      if (!canRetry) throw error;

      const exp = Math.min(max, base * factor ** attempt);
      const delay = jitter ? Math.random() * exp : exp;
      options.onRetry?.({ attempt: attempt + 1, delayMs: delay, error });
      await sleep(delay, options.signal);
      attempt += 1;
    }
  }
}
