import { defineRoute } from "@/lib/api/route-handler";
import { ApiError } from "@/lib/api/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SupabaseEnvError } from "@/lib/supabase/env";
import { otpSendSchema } from "@/lib/validations/auth-otp.schema";

export const runtime = "nodejs";

/** POST /api/auth/otp/send — email OTP for sign-in / sign-up (server-side Supabase). */
export const POST = defineRoute(
  { route: "POST /api/auth/otp/send", auth: "none", publicRateLimit: "subscribe" },
  async ({ request }) => {
    const body = await request.json().catch(() => null);
    const parsed = otpSendSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Invalid email address.", parsed.error.issues);
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

    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data.email.toLowerCase(),
      options: { shouldCreateUser: true },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("api key") || msg.includes("apikey")) {
        throw new ApiError(
          "SERVICE_UNAVAILABLE",
          "Authentication is not configured. Please try again later.",
        );
      }
      throw new ApiError("UNAUTHORIZED", error.message);
    }

    return { sent: true as const };
  },
);
