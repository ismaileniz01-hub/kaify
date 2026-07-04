import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";

type PostgrestErrorLike = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

/**
 * Maps Supabase/Postgres RPC failures to stable ApiError codes.
 * Pass `context` for log correlation (e.g. "[market.service] purchase").
 */
export function mapRpcError(
  error: PostgrestErrorLike,
  context: string,
  fallbackMessage = "İşlem başarısız.",
): never {
  logger.error(`${context} rpc error`, {
    code: error.code,
    message: error.message,
    details: error.details,
  });

  if (error.code === "P0001") {
    const msg = (error.message ?? "").toLowerCase();
    if (msg.includes("not found") || msg.includes("bulunamad")) {
      throw new ApiError("NOT_FOUND", error.message ?? fallbackMessage);
    }
    if (
      msg.includes("already") ||
      msg.includes("duplicate") ||
      msg.includes("zaten")
    ) {
      throw new ApiError("CONFLICT", error.message ?? fallbackMessage);
    }
    if (
      msg.includes("insufficient") ||
      msg.includes("limit") ||
      msg.includes("yetersiz")
    ) {
      throw new ApiError("FORBIDDEN", error.message ?? fallbackMessage);
    }
    throw new ApiError("VALIDATION_ERROR", error.message ?? fallbackMessage);
  }

  throw new ApiError("INTERNAL_ERROR", fallbackMessage);
}
