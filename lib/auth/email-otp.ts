"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

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
    },
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/** Verify the 6-digit code from email and establish a session. */
export async function verifyEmailLoginCode(
  supabase: AuthClient,
  email: string,
  token: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const normalized = token.replace(/\s/g, "");
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: normalized,
    type: "email",
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export function normalizeOtpInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}
