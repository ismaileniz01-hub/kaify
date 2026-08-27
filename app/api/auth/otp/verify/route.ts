import { defineRouteRaw } from "@/lib/api/route-handler";
import { ApiError } from "@/lib/api/errors";
import { fail, ok } from "@/lib/api/response";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { SupabaseEnvError } from "@/lib/supabase/env";
import { otpVerifySchema } from "@/lib/validations/auth-otp.schema";
import { emitProductEvent, productEventIdempotencyKey } from "@/lib/events/product";
import { isNativeWebViewRequest } from "@/lib/native/webview-request";
import { RECAPTCHA_ENTERPRISE_ACTION_OTP_VERIFY } from "@/lib/security/recaptcha-enterprise-mobile";
import {
  extractRecaptchaEnterpriseToken,
  validateOtpCaptcha,
} from "@/lib/security/otp-captcha";

export const runtime = "nodejs";

/** POST /api/auth/otp/verify — verify email OTP and set session cookies on the response. */
export const POST = defineRouteRaw(
  {
    route: "POST /api/auth/otp/verify",
    auth: "none",
    publicRateLimit: "otp_verify",
    requireCsrf: false,
  },
  async ({ request }) => {
    const body = await request.json().catch(() => null);
    const parsed = otpVerifySchema.safeParse(body);
    if (!parsed.success) {
      return fail(
        new ApiError("VALIDATION_ERROR", "Invalid verification code.", parsed.error.issues),
      );
    }

    // Native Enterprise token is optional on verify for web compatibility.
    // When present, validate via Enterprise assessment (never Origin bypass).
    const enterpriseToken = extractRecaptchaEnterpriseToken(
      request,
      parsed.data.recaptchaEnterpriseToken,
    );
    if (enterpriseToken) {
      const captchaOk = await validateOtpCaptcha({
        request,
        recaptchaEnterpriseToken: enterpriseToken,
        recaptchaPlatform: parsed.data.recaptchaPlatform ?? "ios",
        expectedEnterpriseAction: RECAPTCHA_ENTERPRISE_ACTION_OTP_VERIFY,
      });
      if (!captchaOk) {
        return fail(new ApiError("FORBIDDEN", "reCAPTCHA doğrulaması başarısız."));
      }
    }

    try {
      const { supabase, withCookies } = createRouteHandlerSupabase(request);

      const emailAttempt = await supabase.auth.verifyOtp({
        email: parsed.data.email.toLowerCase(),
        token: parsed.data.token,
        type: "email",
      });

      let session = emailAttempt.data?.session ?? null;

      if (emailAttempt.error) {
        const signupAttempt = await supabase.auth.verifyOtp({
          email: parsed.data.email.toLowerCase(),
          token: parsed.data.token,
          type: "signup",
        });

        if (signupAttempt.error) {
          emitProductEvent({
            name: "signup.failed",
            properties: { flow: "otp", error: "invalid_code" },
            idempotencyKey: productEventIdempotencyKey([
              "signup.failed",
              "invalid_code",
            ]),
          });
          return withCookies(
            fail(
              new ApiError("UNAUTHORIZED", "Invalid or expired code. Please try again."),
            ),
          );
        }
        session = signupAttempt.data?.session ?? null;
      }

      emitProductEvent({
        name: "signup.otp_verified",
        properties: { flow: "otp", method: "email" },
        idempotencyKey: productEventIdempotencyKey([
          "signup.otp_verified",
          String(Date.now()).slice(0, 8),
        ]),
      });

      // Capacitor shells need bearer tokens (no shared cookie jar with kaifyai.org).
      // Use the same WebView detection as OTP send (origin + Android wv UA).
      const returnNativeSession =
        Boolean(session?.access_token && session.refresh_token) &&
        isNativeWebViewRequest(request);

      return withCookies(
        ok({
          verified: true as const,
          ...(returnNativeSession && session
            ? {
                session: {
                  accessToken: session.access_token,
                  refreshToken: session.refresh_token,
                },
              }
            : {}),
        }),
      );
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
