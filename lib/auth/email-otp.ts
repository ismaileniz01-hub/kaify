"use client";

import { apiPost, ApiClientError } from "@/lib/api/client";
import { isCompleteOtp, normalizeOtpInput } from "@/lib/auth/otp";

/** Request a one-time email code via the server (avoids missing browser Supabase keys). */
export async function sendEmailLoginCode(
  email: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await apiPost<{ sent: true }>("/api/auth/otp/send", {
      email: email.trim().toLowerCase(),
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof ApiClientError) {
      return { ok: false, message: error.message };
    }
    return { ok: false, message: "failed" };
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
    await apiPost<{ verified: true }>("/api/auth/otp/verify", {
      email: email.trim().toLowerCase(),
      token: normalized,
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof ApiClientError) {
      return { ok: false, message: error.message };
    }
    return { ok: false, message: "invalid" };
  }
}

export { normalizeOtpInput, isCompleteOtp } from "@/lib/auth/otp";
