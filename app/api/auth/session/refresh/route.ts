import { createClient } from "@supabase/supabase-js";
import { defineRouteRaw } from "@/lib/api/route-handler";
import { ApiError } from "@/lib/api/errors";
import { fail, ok } from "@/lib/api/response";
import { nativeSessionRefreshSchema } from "@/lib/validations/auth-otp.schema";
import { isNativeWebViewRequest } from "@/lib/native/webview-request";
import { getSupabasePublicEnv, SupabaseEnvError } from "@/lib/supabase/env";

export const runtime = "nodejs";

/** POST /api/auth/session/refresh — native WebView token refresh (no GoTrue CORS). */
export const POST = defineRouteRaw(
  {
    route: "POST /api/auth/session/refresh",
    auth: "none",
    publicRateLimit: "otp_verify",
  },
  async ({ request }) => {
    if (!isNativeWebViewRequest(request)) {
      return fail(new ApiError("FORBIDDEN", "Native session refresh only."));
    }

    const body = await request.json().catch(() => null);
    const parsed = nativeSessionRefreshSchema.safeParse(body);
    if (!parsed.success) {
      return fail(
        new ApiError("VALIDATION_ERROR", "Invalid refresh token.", parsed.error.issues),
      );
    }

    const refreshToken =
      parsed.data.refreshToken ?? parsed.data.refresh_token ?? "";

    try {
      const { url, anonKey } = getSupabasePublicEnv();
      const supabase = createClient(url, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });
      if (error || !data.session?.access_token || !data.session.refresh_token) {
        return fail(
          new ApiError("UNAUTHORIZED", "Session expired. Please sign in again."),
        );
      }
      return ok({
        session: {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresIn: data.session.expires_in ?? 3600,
          user: data.user
            ? {
                id: data.user.id,
                email: data.user.email,
              }
            : undefined,
        },
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
