import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv, getSupabaseServerEnv } from "@/lib/supabase/env";

export type GoTrueOtpError = {
  code?: string;
  message?: string;
  status?: number;
};

type AdminAuth = ReturnType<typeof createClient>["auth"]["admin"];

function isAlreadyRegistered(message: string | undefined): boolean {
  return /already been registered|already exists|email_exists/i.test(
    message ?? "",
  );
}

async function findAuthUserId(
  admin: AdminAuth,
  email: string,
): Promise<string | null> {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find(
      (user) => user.email?.toLowerCase() === email,
    );
    if (found) return found.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

/**
 * Confirm-signup emails use {{ .ConfirmationURL }} in the hosted Auth
 * template, so a brand-new Gmail gets a "confirm your email" link instead
 * of a 6-digit code. Mark the user confirmed via Admin, then send a login
 * OTP (create_user: false) which uses the magic-link template with {{ .Token }}.
 */
async function ensureConfirmedAuthUser(
  email: string,
  locale: "tr" | "en",
): Promise<void> {
  const { url, serviceRoleKey } = getSupabaseServerEnv();
  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  }).auth.admin;

  const created = await admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { language: locale },
  });

  if (created.data.user) return;
  if (created.error && !isAlreadyRegistered(created.error.message)) {
    throw created.error;
  }

  const existingId = await findAuthUserId(admin, email);
  if (!existingId) {
    throw created.error ?? new Error("Could not load auth user for OTP.");
  }

  const updated = await admin.updateUserById(existingId, {
    email_confirm: true,
  });
  if (updated.error) throw updated.error;
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

/**
 * Request an email OTP via GoTrue (no PKCE / redirect_to).
 *
 * Never uses create_user: true — that triggers the Confirm signup mailer
 * (a Gmail confirmation link) instead of a 6-digit code.
 */
export async function sendAuthEmailOtp(
  email: string,
  locale: "tr" | "en" = "en",
): Promise<{ ok: true } | { ok: false; error: GoTrueOtpError }> {
  const normalizedEmail = email.trim().toLowerCase();

  try {
    await ensureConfirmedAuthUser(normalizedEmail, locale);
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
