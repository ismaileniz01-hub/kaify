import { defineRouteRaw } from "@/lib/api/route-handler";
import { ApiError } from "@/lib/api/errors";
import { fail, ok } from "@/lib/api/response";
import { hashEmail, validateRecaptcha } from "@/lib/api-security";
import {
  OTP_RESEND_AFTER_SECONDS,
  enforceOtpResendCooldown,
  enforceOtpTargetHourlyRateLimit,
  enforceOtpTargetRateLimit,
} from "@/lib/api/rate-guard";
import { mapGoTrueOtpSendError } from "@/lib/auth/map-otp-send-error";
import { sendAuthEmailOtp } from "@/lib/auth/send-otp-server";
import { shouldSkipOtpCaptchaForNativeOrigin } from "@/lib/native/otp-cors";
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

    const origin = request.headers.get("origin");
    const skipCaptcha = shouldSkipOtpCaptchaForNativeOrigin(origin);
    if (!skipCaptcha) {
      const captchaOk = await validateRecaptcha(parsed.data.recaptchaToken ?? "");
      if (!captchaOk) {
        return fail(new ApiError("FORBIDDEN", "reCAPTCHA doğrulaması başarısız."));
      }
    }

    // Per-target throttles (hashed). Independent of captcha. Order:
    // 60s cooldown → 5/15m → 5/hour. IP publicRateLimit already ran above.
    const emailHash = await hashEmail(parsed.data.email);
    try {
      await enforceOtpResendCooldown(emailHash);
      await enforceOtpTargetRateLimit(emailHash);
      await enforceOtpTargetHourlyRateLimit(emailHash);
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

      // New GoTrue OTP supersedes prior unused codes for the same email
      // (provider-owned). Kaify returns a stable success shape for native+web.
      return ok({
        sent: true as const,
        resendAfterSeconds: OTP_RESEND_AFTER_SECONDS,
      });
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
