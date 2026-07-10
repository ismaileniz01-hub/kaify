import { defineRouteRaw } from "@/lib/api/route-handler";
import { ApiError } from "@/lib/api/errors";
import { fail, ok } from "@/lib/api/response";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { SupabaseEnvError } from "@/lib/supabase/env";
import { otpVerifySchema } from "@/lib/validations/auth-otp.schema";

export const runtime = "nodejs";

/** POST /api/auth/otp/verify — verify email OTP and set session cookies on the response. */
export const POST = defineRouteRaw(
  { route: "POST /api/auth/otp/verify", auth: "none", publicRateLimit: "subscribe" },
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

      const { error } = await supabase.auth.verifyOtp({
        email: parsed.data.email.toLowerCase(),
        token: parsed.data.token,
        type: "email",
      });

      if (error) {
        return withCookies(
          fail(
            new ApiError("UNAUTHORIZED", "Invalid or expired code. Please try again."),
          ),
        );
      }

      return withCookies(ok({ verified: true as const }));
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
