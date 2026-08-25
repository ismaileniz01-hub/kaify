"use client";

import { apiPost, ApiClientError } from "@/lib/api/client";
import { isCompleteOtp, normalizeOtpInput } from "@/lib/auth/otp";
import { tryCreateBrowserSupabaseClient } from "@/lib/supabase/client";

/** Request a one-time email code via the server (avoids missing browser Supabase keys). */
export async function sendEmailLoginCode(
  email: string,
  recaptchaToken?: string,
  locale: "tr" | "en" = "en",
): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  try {
    await apiPost<{ sent: true }>("/api/auth/otp/send", {
      email: email.trim().toLowerCase(),
      locale,
      ...(recaptchaToken ? { recaptchaToken } : {}),
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof ApiClientError) {
      return { ok: false, code: error.code, message: error.message };
    }
    return { ok: false, code: "INTERNAL_ERROR", message: "failed" };
  }
}

/** Verify the email OTP and establish a session (cookies set server-side). */
export async function verifyEmailLoginCode(
  email: string,
  token: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const normalized = normalizeOtpInput(token);
  if (!isCompleteOtp(normalized)) {
    return { ok: false, message: "invalid_length" };
  }

  try {
    const result = await apiPost<{
      verified: true;
      session?: { accessToken: string; refreshToken: string };
    }>("/api/auth/otp/verify", {
      email: email.trim().toLowerCase(),
      token: normalized,
    });

    if (result.session) {
      const supabase = tryCreateBrowserSupabaseClient();
      if (!supabase) return { ok: false, message: "auth_not_configured" };
      const { error } = await supabase.auth.setSession({
        access_token: result.session.accessToken,
        refresh_token: result.session.refreshToken,
      });
      if (error) return { ok: false, message: error.message };
    }
    return { ok: true };
  } catch (error) {
    if (error instanceof ApiClientError) {
      return { ok: false, message: error.message };
    }
    return { ok: false, message: "invalid" };
  }
}

export { normalizeOtpInput, isCompleteOtp } from "@/lib/auth/otp";
