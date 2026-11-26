import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { getSupabasePublicEnv, getSupabaseServerEnv } from "@/lib/supabase/env";

export type GoTrueOtpError = {
  code?: string;
  message?: string;
  status?: number;
};

/**
 * Make sure an auth row exists for this address before asking for a code.
 *
 * The row is created UNCONFIRMED and with a provider-generated password.
 * Nothing here may ever confirm the address: only a code read from the mailbox
 * (or an identity provider) proves ownership. Confirming early would let
 * whoever registered the address first keep a working password for it, because
 * GoTrue only discards an unproven password while the account is unconfirmed.
 *
 * Creating the row up front, instead of letting /otp do it, also means /otp
 * never takes its "user not found" branch, where a concurrent signup could
 * slip in a password of its own.
 *
 * A failure is never fatal. "Already registered" is the normal case, and a
 * concurrent signup surfaces as a generic 500; in both, /otp must still run
 * because that is the call that discards an unproven password. If no row
 * exists, /otp with create_user: false fails closed.
 */
async function ensureAuthUserExists(
  email: string,
  locale: "tr" | "en",
): Promise<void> {
  const { url, serviceRoleKey } = getSupabaseServerEnv();
  const { error } = await createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  }).auth.admin.createUser({
    email,
    email_confirm: false,
    user_metadata: { language: locale },
  });

  if (error && error.code !== "email_exists") {
    logger.warn("otp prepare: could not create auth user", {
      code: error.code,
      status: error.status,
    });
  }
}

async function requestLoginOtp(
  email: string,
  locale: "tr" | "en",
): Promise<{ ok: true } | { ok: false; error: GoTrueOtpError }> {
  const { url, anonKey } = getSupabasePublicEnv();

  const response = await fetch(`${url}/auth/v1/otp`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      create_user: false,
      data: { language: locale },
    }),
  });

  if (response.ok) {
    return { ok: true };
  }

  let payload: GoTrueOtpError = {
    status: response.status,
    message: "Could not send verification code.",
  };

  try {
    // GoTrue's legacy shape carries the HTTP status in a numeric `code`.
    const json = (await response.json()) as {
      code?: string | number;
      msg?: string;
      message?: string;
      error_code?: string;
    };
    payload = {
      status: response.status,
      code:
        json.error_code ?? (typeof json.code === "string" ? json.code : undefined),
      message: json.msg ?? json.message ?? payload.message,
    };
  } catch {
    // keep generic message
  }

  return { ok: false, error: payload };
}

/**
 * Request an email OTP via GoTrue (no PKCE / redirect_to).
 *
 * Confirmed users get the Magic Link template; unconfirmed users get the
 * Confirm signup template. Both hosted templates must render {{ .Token }} and
 * no link (supabase/email-templates, npm run auth:otp-template).
 */
export async function sendAuthEmailOtp(
  email: string,
  locale: "tr" | "en" = "en",
): Promise<{ ok: true } | { ok: false; error: GoTrueOtpError }> {
  const normalizedEmail = email.trim().toLowerCase();

  try {
    await ensureAuthUserExists(normalizedEmail, locale);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not prepare account.";
    return {
      ok: false,
      error: { message, status: 500, code: "otp_prepare_failed" },
    };
  }

  return requestLoginOtp(normalizedEmail, locale);
}
