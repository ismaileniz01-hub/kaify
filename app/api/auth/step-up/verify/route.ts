import { z } from "zod";
import { defineRouteRaw } from "@/lib/api/route-handler";
import { ApiError } from "@/lib/api/errors";
import { fail, ok } from "@/lib/api/response";
import { attachStepUpCookie } from "@/lib/auth/step-up";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { SupabaseEnvError } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  token: z.string().trim().min(4).max(12),
});

/**
 * POST /api/auth/step-up/verify — confirm email OTP and mint step-up cookie.
 * Re-verifies the signed-in user's email without ending their session.
 */
export const POST = defineRouteRaw(
  {
    route: "POST /api/auth/step-up/verify",
    auth: "user",
    rateLimit: "otp_verify",
    requireCsrf: true,
    skipMfa: true,
  },
  async ({ user, request }) => {
    const email = user.email?.trim().toLowerCase();
    if (!email) {
      return fail(new ApiError("VALIDATION_ERROR", "Hesap e-postası bulunamadı."));
    }

    const raw = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return fail(
        new ApiError("VALIDATION_ERROR", "Geçersiz doğrulama kodu.", parsed.error.issues),
      );
    }

    try {
      const { supabase, withCookies } = createRouteHandlerSupabase(request);
      const attempt = await supabase.auth.verifyOtp({
        email,
        token: parsed.data.token,
        type: "email",
      });

      if (attempt.error) {
        return withCookies(
          fail(
            new ApiError("UNAUTHORIZED", "Invalid or expired code. Please try again."),
          ),
        );
      }

      const verifiedUser = attempt.data.user;
      if (!verifiedUser || verifiedUser.id !== user.id) {
        return withCookies(
          fail(new ApiError("FORBIDDEN", "Doğrulama kullanıcıyla eşleşmedi.")),
        );
      }

      return withCookies(attachStepUpCookie(ok({ verified: true as const }), user.id));
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
