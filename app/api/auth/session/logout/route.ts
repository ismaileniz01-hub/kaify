import { defineRouteRaw } from "@/lib/api/route-handler";
import { ApiError } from "@/lib/api/errors";
import { fail, ok } from "@/lib/api/response";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { SupabaseEnvError } from "@/lib/supabase/env";

export const runtime = "nodejs";

/**
 * POST /api/auth/session/logout — expire auth cookies.
 * Native shells need this because supabase-js signOut in the WebView can hang
 * or miss the httpOnly cookies set by /api/auth/session/establish.
 */
export const POST = defineRouteRaw(
  {
    route: "POST /api/auth/session/logout",
    auth: "none",
    publicRateLimit: "otp_verify",
  },
  async ({ request }) => {
    try {
      const { supabase, withCookies } = createRouteHandlerSupabase(request);
      await supabase.auth.signOut({ scope: "local" });
      return withCookies(ok({ signedOut: true as const }));
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
