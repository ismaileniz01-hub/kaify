/**
 * Error taxonomy — the brain of the self-healing layer.
 *
 * Turns any thrown value (HTTP status, fetch/network error, timeout, AiError,
 * ApiError …) into a category and a `retryable` flag so the retry + circuit
 * layers can react deterministically:
 *
 *   transient / upstream / rate_limit  → safe to retry & counts toward circuit
 *   client / auth / not_implemented    → do NOT retry (bug or caller fault)
 *   fatal                              → unknown; do NOT retry
 */

export type ErrorCategory =
  | "transient" // network blip, timeout, connection reset
  | "upstream" // dependency returned 5xx (502/503/504…)
  | "rate_limit" // 408 / 425 / 429 — retry with backoff
  | "client" // 400 / 404 / 409 / 422 — caller fault, not retryable
  | "auth" // 401 / 403 — permission, not retryable
  | "not_implemented" // 501 — code-level gap, not runtime-healable
  | "fatal"; // unknown / unclassified

export type Classification = {
  category: ErrorCategory;
  retryable: boolean;
  /** Whether this failure should count toward opening a circuit breaker. */
  countsTowardCircuit: boolean;
  status?: number;
};

/**
 * A dependency responded with a non-2xx HTTP status. `fetch` does not throw on
 * 5xx, so callers throw this explicitly to feed the taxonomy the real status.
 */
export class UpstreamHttpError extends Error {
  readonly status: number;
  readonly provider?: string;

  constructor(status: number, message?: string, provider?: string) {
    super(message ?? `Upstream responded with HTTP ${status}`);
    this.name = "UpstreamHttpError";
    this.status = status;
    this.provider = provider;
  }
}

const AVAILABILITY: ErrorCategory[] = ["transient", "upstream", "rate_limit"];

function make(category: ErrorCategory, status?: number): Classification {
  const retryable = AVAILABILITY.includes(category);
  return {
    category,
    retryable,
    countsTowardCircuit: retryable,
    status,
  };
}

/** Classify a raw HTTP status code. */
export function classifyStatus(status: number): Classification {
  if (status === 408 || status === 425 || status === 429) {
    return make("rate_limit", status);
  }
  if (status === 501) return make("not_implemented", status);
  if (status === 401 || status === 403) return make("auth", status);
  if (status >= 500) return make("upstream", status); // 500/502/503/504…
  if (status >= 400) return make("client", status); // 400/404/409/422…
  return make("fatal", status); // 2xx/3xx should never reach here as an error
}

function isAbortLike(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error instanceof Error) {
    const n = error.name;
    if (n === "AbortError" || n === "TimeoutError") return true;
  }
  return false;
}

const NETWORK_HINTS = [
  "fetch failed",
  "network",
  "econnreset",
  "econnrefused",
  "etimedout",
  "eai_again",
  "socket hang up",
  "and retry",
  "timed out",
  "timeout",
];

/** Classify any thrown value into an actionable category. */
export function classifyError(error: unknown): Classification {
  if (error instanceof UpstreamHttpError) return classifyStatus(error.status);

  // ApiError / anything exposing a numeric HTTP status.
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  ) {
    return classifyStatus((error as { status: number }).status);
  }

  // Abort / timeout → transient (retryable).
  if (isAbortLike(error)) return make("transient");

  // Duck-typed AiError (avoid a hard import to keep this layer transport-free).
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  ) {
    const code = (error as { code: string }).code;
    switch (code) {
      case "AI_TIMEOUT":
        return make("transient");
      case "AI_UPSTREAM":
        return make("upstream");
      case "AI_RATE_LIMIT":
        return make("rate_limit");
      case "AI_BAD_OUTPUT":
      case "AI_LOW_QUALITY":
      case "AI_CONFIG":
        return make("client");
      default:
        break;
    }
  }

  // Fetch/network errors surface as TypeError with a recognizable message.
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (NETWORK_HINTS.some((hint) => msg.includes(hint))) {
      return make("transient");
    }
  }

  return make("fatal");
}

/** Convenience: is this error worth retrying? */
export function isRetryable(error: unknown): boolean {
  return classifyError(error).retryable;
}
