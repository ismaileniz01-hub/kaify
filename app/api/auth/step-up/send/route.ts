import { defineRoute } from "@/lib/api/route-handler";
import { ApiError } from "@/lib/api/errors";
import { mapGoTrueOtpSendError } from "@/lib/auth/map-otp-send-error";
import { sendAuthEmailOtp } from "@/lib/auth/send-otp-server";
import { SupabaseEnvError } from "@/lib/supabase/env";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/auth/step-up/send — OTP for sensitive actions (authenticated). */
export const POST = defineRoute(
  {
    route: "POST /api/auth/step-up/send",
    auth: "user",
    rateLimit: "otp_send",
    requireCsrf: true,
    skipMfa: true,
  },
  async ({ user }) => {
    const email = user.email?.trim().toLowerCase();
    if (!email) {
      throw new ApiError("VALIDATION_ERROR", "Hesap e-postası bulunamadı.");
    }

    try {
      const result = await sendAuthEmailOtp(email);
      if (!result.ok) {
        logger.warn("step-up otp send failed", {
          code: result.error.code,
          message: result.error.message,
        });
        throw mapGoTrueOtpSendError(result.error);
      }
      return { sent: true as const };
    } catch (error) {
      if (error instanceof SupabaseEnvError) {
        throw new ApiError(
          "SERVICE_UNAVAILABLE",
          "Authentication is not configured. Please try again later.",
        );
      }
      throw error;
    }
  },
);
