import { defineRouteRaw } from "@/lib/api/route-handler";
import { ApiError } from "@/lib/api/errors";
import { fail, ok } from "@/lib/api/response";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { SupabaseEnvError } from "@/lib/supabase/env";
import { otpVerifySchema } from "@/lib/validations/auth-otp.schema";
import { emitProductEvent, productEventIdempotencyKey } from "@/lib/events/product";

export const runtime = "nodejs";

/** POST /api/auth/otp/verify — verify email OTP and set session cookies on the response. */
export const POST = defineRouteRaw(
  { route: "POST /api/auth/otp/verify", auth: "none", publicRateLimit: "otp_verify" },
  async ({ request }) => {
    const body = await request.json().catch(() => null);
    const parsed = otpVerifySchema.safeParse(body);
    if (!parsed.success) {
      return fail(
        new ApiError("VALIDATION_ERROR", "Invalid verification code.", parsed.error.issues),
      );
    }

    try {
      const { supabase, withCookies } = createRouteHandlerSupabase(request);

      const emailAttempt = await supabase.auth.verifyOtp({
        email: parsed.data.email.toLowerCase(),
        token: parsed.data.token,
        type: "email",
      });

      let session = emailAttempt.data.session;

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
        session = signupAttempt.data.session;
      }

      emitProductEvent({
        name: "signup.otp_verified",
        properties: { flow: "otp", method: "email" },
        idempotencyKey: productEventIdempotencyKey([
          "signup.otp_verified",
          String(Date.now()).slice(0, 8),
        ]),
      });

      const origin = request.headers.get("origin");
      const isNativeOrigin =
        origin === "capacitor://localhost" ||
        origin === "https://localhost" ||
        origin === "http://localhost";

      return withCookies(
        ok({
          verified: true as const,
          ...(isNativeOrigin && session
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
