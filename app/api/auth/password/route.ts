import { defineRouteRaw } from "@/lib/api/route-handler";
import { ApiError } from "@/lib/api/errors";
import { fail, ok } from "@/lib/api/response";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { SupabaseEnvError } from "@/lib/supabase/env";
import { passwordLoginSchema } from "@/lib/validations/auth-otp.schema";
import { isNativeWebViewRequest } from "@/lib/native/webview-request";

export const runtime = "nodejs";

/**
 * POST /api/auth/password — email+password session for store reviewers.
 * Play Console requires reusable credentials that bypass email OTP; this
 * route is rate-limited and does not use reCAPTCHA so native WebViews work.
 */
export const POST = defineRouteRaw(
  { route: "POST /api/auth/password", auth: "none", publicRateLimit: "otp_verify" },
  async ({ request }) => {
    const body = await request.json().catch(() => null);
    const parsed = passwordLoginSchema.safeParse(body);
    if (!parsed.success) {
      return fail(
        new ApiError("VALIDATION_ERROR", "Invalid email or password.", parsed.error.issues),
      );
    }

    try {
      const { supabase, withCookies } = createRouteHandlerSupabase(request);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email.toLowerCase(),
        password: parsed.data.password,
      });

      if (error) {
        return withCookies(
          fail(new ApiError("UNAUTHORIZED", "Invalid email or password.")),
        );
      }

      const session = data.session;
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
