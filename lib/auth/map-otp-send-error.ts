import type { AuthError } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api/errors";

/** Maps Supabase signInWithOtp failures to stable API errors. */
export function mapOtpSendError(error: AuthError): ApiError {
  const message = error.message.toLowerCase();
  const code = (error.code ?? "").toLowerCase();

  if (
    code.includes("rate") ||
    message.includes("rate limit") ||
    message.includes("once every")
  ) {
    return new ApiError(
      "RATE_LIMITED",
      "Too many code requests. Please wait a minute and try again.",
    );
  }

  if (message.includes("api key") || message.includes("apikey")) {
    return new ApiError(
      "SERVICE_UNAVAILABLE",
      "Authentication is not configured. Please try again later.",
    );
  }

  if (
    message.includes("signup") && message.includes("disabled") ||
    code === "signup_disabled"
  ) {
    return new ApiError(
      "SERVICE_UNAVAILABLE",
      "Email sign-up is temporarily unavailable. Please try again later.",
    );
  }

  if (
    message.includes("invalid") && message.includes("email") ||
    code === "email_address_invalid"
  ) {
    return new ApiError("VALIDATION_ERROR", "Please enter a valid email address.");
  }

  if (
    message.includes("column") ||
    message.includes("relation") ||
    message.includes("database") ||
    message.includes("transaction") ||
    code === "unexpected_failure"
  ) {
    return new ApiError(
      "SERVICE_UNAVAILABLE",
      "Account setup failed on the server. Please try again in a moment.",
    );
  }

  return new ApiError(
    "VALIDATION_ERROR",
    "Could not send verification code. Check your email and try again.",
  );
}
