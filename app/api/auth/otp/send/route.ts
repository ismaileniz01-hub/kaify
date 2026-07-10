import { defineRouteRaw } from "@/lib/api/route-handler";
import { ApiError } from "@/lib/api/errors";
import { fail, ok } from "@/lib/api/response";
import { mapOtpSendError } from "@/lib/auth/map-otp-send-error";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { SupabaseEnvError } from "@/lib/supabase/env";
import { otpSendSchema } from "@/lib/validations/auth-otp.schema";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/** POST /api/auth/otp/send — email OTP for sign-in / sign-up (server-side Supabase). */
export const POST = defineRouteRaw(
  { route: "POST /api/auth/otp/send", auth: "none", publicRateLimit: "subscribe" },
  async ({ request }) => {
    const body = await request.json().catch(() => null);
    const parsed = otpSendSchema.safeParse(body);
    if (!parsed.success) {
      return fail(
        new ApiError("VALIDATION_ERROR", "Invalid email address.", parsed.error.issues),
      );
    }

    try {
      const { supabase } = createRouteHandlerSupabase(request);

      const { error } = await supabase.auth.signInWithOtp({
        email: parsed.data.email.toLowerCase(),
        options: { shouldCreateUser: true },
      });

      if (error) {
        logger.warn("otp send failed", {
          code: error.code,
          message: error.message,
          status: error.status,
        });
        return fail(mapOtpSendError(error));
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
