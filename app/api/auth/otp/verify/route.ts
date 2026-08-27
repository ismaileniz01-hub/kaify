import { defineRouteRaw } from "@/lib/api/route-handler";
import { ApiError } from "@/lib/api/errors";
import { fail, ok } from "@/lib/api/response";
import { hashEmail } from "@/lib/api-security";
import { enforceOtpVerifyTargetRateLimit } from "@/lib/api/rate-guard";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { SupabaseEnvError } from "@/lib/supabase/env";
import { isNativeOtpOrigin } from "@/lib/native/otp-cors";
import { otpVerifySchema } from "@/lib/validations/auth-otp.schema";

export const runtime = "nodejs";

/** POST /api/auth/otp/verify — verify email OTP and set session cookies on the response. */
export const POST = defineRouteRaw(
  {
    route: "POST /api/auth/otp/verify",
    auth: "none",
    publicRateLimit: "otp_verify",
    // Public OTP; Capacitor has no double-submit CSRF cookie.
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

    const emailHash = await hashEmail(parsed.data.email);
    try {
      await enforceOtpVerifyTargetRateLimit(emailHash);
    } catch (error) {
      if (error instanceof ApiError) return fail(error);
      throw error;
    }

    try {
      const { supabase, withCookies } = createRouteHandlerSupabase(request);

      const emailAttempt = await supabase.auth.verifyOtp({
        email: parsed.data.email.toLowerCase(),
        token: parsed.data.token,
        type: "email",
      });

      let session = emailAttempt.data?.session;

      if (emailAttempt.error) {
        const signupAttempt = await supabase.auth.verifyOtp({
          email: parsed.data.email.toLowerCase(),
          token: parsed.data.token,
          type: "signup",
        });

        if (signupAttempt.error) {
          // Uniform unauthorized — do not reveal whether the email is registered.
          return withCookies(
            fail(
              new ApiError("UNAUTHORIZED", "Invalid or expired code. Please try again."),
            ),
          );
        }
        session = signupAttempt.data?.session;
      }

      const origin = request.headers.get("origin");
      const returnNativeSession =
        Boolean(session?.access_token && session.refresh_token) &&
        isNativeOtpOrigin(origin);

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
