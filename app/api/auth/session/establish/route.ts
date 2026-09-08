import { defineRouteRaw } from "@/lib/api/route-handler";
import { ApiError } from "@/lib/api/errors";
import { fail, ok } from "@/lib/api/response";
import { nativeSessionEstablishSchema } from "@/lib/validations/auth-otp.schema";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { SupabaseEnvError } from "@/lib/supabase/env";
import { NATIVE_SESSION_HINT_COOKIE } from "@/lib/native/native-entry-boot";

export const runtime = "nodejs";

/** POST /api/auth/session/establish — set auth cookies from native OTP tokens. */
export const POST = defineRouteRaw(
  {
    route: "POST /api/auth/session/establish",
    auth: "none",
    publicRateLimit: "otp_verify",
  },
  async ({ request }) => {
    const body = await request.json().catch(() => null);
    const parsed = nativeSessionEstablishSchema.safeParse(body);
    if (!parsed.success) {
      return fail(
        new ApiError("VALIDATION_ERROR", "Invalid session.", parsed.error.issues),
      );
    }

    try {
      const { supabase, withCookies } = createRouteHandlerSupabase(request);
      const { error } = await supabase.auth.setSession({
        access_token: parsed.data.accessToken,
        refresh_token: parsed.data.refreshToken,
      });
      if (error) {
        return fail(
          new ApiError("UNAUTHORIZED", "Session expired. Please sign in again."),
        );
      }
      const established = withCookies(ok({ established: true as const }));
      established.cookies.set(NATIVE_SESSION_HINT_COOKIE, "1", {
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        sameSite: "lax",
        secure: true,
        httpOnly: false,
      });
      return established;
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
