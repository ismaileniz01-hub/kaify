import { ApiError } from "@/lib/api/errors";

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
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  if (error instanceof AiError) {
    switch (error.code) {
      case "AI_CONFIG":
        return new ApiError("INTERNAL_ERROR", "AI servisi şu anda yapılandırılmamış.");
      case "AI_LOW_QUALITY":
        return new ApiError("VALIDATION_ERROR", error.message, error.details);
      case "AI_BAD_OUTPUT":
        return new ApiError("INTERNAL_ERROR", "AI yanıtı işlenemedi, lütfen tekrar deneyin.");
      case "AI_TIMEOUT":
        return new ApiError("INTERNAL_ERROR", "AI servisi zaman aşımına uğradı.");
      case "AI_UPSTREAM":
      default:
        return new ApiError("INTERNAL_ERROR", "AI servisine ulaşılamadı, lütfen tekrar deneyin.");
    }
  }
  return new ApiError("INTERNAL_ERROR", "Beklenmeyen bir hata oluştu.");
}
