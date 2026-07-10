import { getSupabasePublicEnv } from "@/lib/supabase/env";

export type GoTrueOtpError = {
  code?: string;
  message?: string;
  status?: number;
};

/**
 * Request an email OTP via GoTrue directly (no PKCE / redirect_to).
 *
 * The Supabase JS client on SSR can attach PKCE + redirect metadata, which
 * makes Auth send a magic link even when the template uses {{ .Token }}.
 */
export async function sendAuthEmailOtp(
  email: string,
): Promise<{ ok: true } | { ok: false; error: GoTrueOtpError }> {
  const { url, anonKey } = getSupabasePublicEnv();
  const normalizedEmail = email.trim().toLowerCase();

  const response = await fetch(`${url}/auth/v1/otp`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: normalizedEmail,
      create_user: true,
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
    const json = (await response.json()) as {
      code?: string;
      msg?: string;
      message?: string;
      error_code?: string;
    };
    payload = {
      status: response.status,
      code: json.code ?? json.error_code,
      message: json.msg ?? json.message ?? payload.message,
    };
  } catch {
    // keep generic message
  }

  return { ok: false, error: payload };
}
