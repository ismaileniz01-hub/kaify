import { defineRoute } from "@/lib/api/route-handler";
import { ApiError } from "@/lib/api/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SupabaseEnvError } from "@/lib/supabase/env";
import { otpVerifySchema } from "@/lib/validations/auth-otp.schema";

export const runtime = "nodejs";

/** POST /api/auth/otp/verify — verify email OTP and set session cookies. */
export const POST = defineRoute(
  { route: "POST /api/auth/otp/verify", auth: "none", publicRateLimit: "subscribe" },
  async ({ request }) => {
    const body = await request.json().catch(() => null);
    const parsed = otpVerifySchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Invalid verification code.", parsed.error.issues);
    }

    let supabase;
    try {
      supabase = await createServerSupabaseClient();
    } catch (error) {
      if (error instanceof SupabaseEnvError) {
        throw new ApiError(
          "SERVICE_UNAVAILABLE",
          "Authentication is not configured. Please try again later.",
        );
      }
      throw error;
    }

    const { error } = await supabase.auth.verifyOtp({
      email: parsed.data.email.toLowerCase(),
      token: parsed.data.token,
      type: "email",
    });

    if (error) {
      throw new ApiError("UNAUTHORIZED", "Invalid or expired code. Please try again.");
    }

    return { verified: true as const };
  },
);
