"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { isCompleteOtp, normalizeOtpInput } from "@/lib/auth/otp";

type AuthClient = SupabaseClient<Database>;

/** Request a one-time email code (English template in supabase/email-templates/). */
export async function sendEmailLoginCode(
  supabase: AuthClient,
  email: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      // Auth emails use the Supabase Magic Link template — keep it English-only
      // (see supabase/email-templates/magic-link-otp.en.html).
      // Dashboard: Auth → Providers → Email → OTP length should be 6.
    },
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/** Verify the email OTP and establish a session. */
export async function verifyEmailLoginCode(
  supabase: AuthClient,
  email: string,
  token: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const normalized = normalizeOtpInput(token);
  if (!isCompleteOtp(normalized)) {
    return { ok: false, message: "invalid_length" };
  }
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: normalized,
    type: "email",
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export { normalizeOtpInput, isCompleteOtp } from "@/lib/auth/otp";
