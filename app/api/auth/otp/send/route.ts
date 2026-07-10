import { defineRouteRaw } from "@/lib/api/route-handler";
import { ApiError } from "@/lib/api/errors";
import { fail, ok } from "@/lib/api/response";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { SupabaseEnvError, getSupabasePublicEnv } from "@/lib/supabase/env";
import { otpSendSchema } from "@/lib/validations/auth-otp.schema";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database.types";
import { cookies } from "next/headers";

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
      const { url, anonKey } = getSupabasePublicEnv();
      const cookieStore = await cookies();
      const supabase = createServerClient<Database>(url, anonKey, {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      });

      const { error } = await supabase.auth.signInWithOtp({
        email: parsed.data.email.toLowerCase(),
        options: { shouldCreateUser: true },
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("api key") || msg.includes("apikey")) {
          return fail(
            new ApiError(
              "SERVICE_UNAVAILABLE",
              "Authentication is not configured. Please try again later.",
            ),
          );
        }
        return fail(
          new ApiError(
            "VALIDATION_ERROR",
            "Could not send verification code. Check your email and try again.",
          ),
        );
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
