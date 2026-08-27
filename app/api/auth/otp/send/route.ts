import { defineRouteRaw } from "@/lib/api/route-handler";
import { ApiError } from "@/lib/api/errors";
import { fail, ok } from "@/lib/api/response";
import { hashEmail, validateRecaptcha } from "@/lib/api-security";
import { enforceOtpTargetRateLimit } from "@/lib/api/rate-guard";
import { mapGoTrueOtpSendError } from "@/lib/auth/map-otp-send-error";
import { sendAuthEmailOtp } from "@/lib/auth/send-otp-server";
import { SupabaseEnvError } from "@/lib/supabase/env";
import { otpSendSchema } from "@/lib/validations/auth-otp.schema";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/** POST /api/auth/otp/send — email OTP for sign-in / sign-up (server-side Supabase). */
export const POST = defineRouteRaw(
  {
    route: "POST /api/auth/otp/send",
    auth: "none",
    publicRateLimit: "otp_send",
    // Public OTP; Capacitor has no double-submit CSRF cookie.
    requireCsrf: false,
  },
  async ({ request }) => {
    const body = await request.json().catch(() => null);
    const parsed = otpSendSchema.safeParse(body);
    if (!parsed.success) {
      return fail(
        new ApiError("VALIDATION_ERROR", "Invalid email address.", parsed.error.issues),
      );
    }

    const captchaOk = await validateRecaptcha(parsed.data.recaptchaToken ?? "");
    if (!captchaOk) {
      return fail(new ApiError("FORBIDDEN", "reCAPTCHA doğrulaması başarısız."));
    }

    // Per-target throttle (hashed). Runs after schema validation so invalid
    // emails do not consume the bucket, and before send so rotating IPs cannot
    // linearly bomb one address. Response shape stays identical on limit.
    const emailHash = await hashEmail(parsed.data.email);
    try {
      await enforceOtpTargetRateLimit(emailHash);
    } catch (error) {
      if (error instanceof ApiError) return fail(error);
      throw error;
    }

    try {
      const result = await sendAuthEmailOtp(
        parsed.data.email,
        parsed.data.locale,
      );

      if (!result.ok) {
        logger.warn("otp send failed", {
          code: result.error.code,
          message: result.error.message,
          status: result.error.status,
        });
        return fail(mapGoTrueOtpSendError(result.error));
      }

      return ok({ sent: true as const });
    } catch (error) {
      if (error instanceof SupabaseEnvError) {
        return fail(
          new ApiError(
            "SERVICE_UNAVAILABLE",
            "Authentication is not configured. Please try again later.",
          ),
        );
      }
      throw error;
    }
  },
);
