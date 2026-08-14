import { ApiError } from "@/lib/api/errors";
import { aiCopy } from "@/lib/ai/ai-copy";

/**
 * AI-layer error taxonomy. Kept separate from ApiError so the model/router
 * layer stays transport-agnostic; the service layer maps these to ApiError.
 */
export type AiErrorCode =
  | "AI_CONFIG" // missing/invalid keys or model config
  | "AI_UPSTREAM" // provider returned non-2xx / network failure
  | "AI_TIMEOUT" // request exceeded the deadline
  | "AI_BAD_OUTPUT" // provider output failed schema validation
  | "AI_LOW_QUALITY"; // image rejected by pre-analysis quality gate

export class AiError extends Error {
  readonly code: AiErrorCode;
  readonly details?: unknown;

  constructor(code: AiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AiError";
    this.code = code;
    this.details = details;
  }
}

/**
 * Maps an AiError to a client-safe ApiError. Internal provider details are
 * never forwarded to the client — only safe, user-facing messages.
 */
export function toApiError(error: unknown, locale?: string): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  if (error instanceof AiError) {
    switch (error.code) {
      case "AI_CONFIG":
        return new ApiError("INTERNAL_ERROR", aiCopy(locale, "ai_unconfigured"));
      case "AI_LOW_QUALITY":
        return new ApiError(
          "VALIDATION_ERROR",
          error.message || aiCopy(locale, "low_quality_image"),
          error.details,
        );
      case "AI_BAD_OUTPUT":
        return new ApiError("INTERNAL_ERROR", aiCopy(locale, "ai_bad_output"));
      case "AI_TIMEOUT":
        return new ApiError("INTERNAL_ERROR", aiCopy(locale, "ai_timeout"));
      case "AI_UPSTREAM":
      default:
        return new ApiError("INTERNAL_ERROR", aiCopy(locale, "ai_upstream"));
    }
  }
  return new ApiError("INTERNAL_ERROR", aiCopy(locale, "chat_failed"));
}
