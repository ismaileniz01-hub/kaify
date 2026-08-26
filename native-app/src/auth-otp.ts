import { isCompleteOtp, normalizeOtpInput } from "@/lib/auth/otp";
import { supabase } from "./session";

const NATIVE_CLIENT_VERSION = "native-1.0.1";

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = {
  success: false;
  error?: { code?: string; message?: string };
};

async function parseApiJson<T>(
  response: Response,
): Promise<ApiSuccess<T> | ApiFailure> {
  try {
    return (await response.json()) as ApiSuccess<T> | ApiFailure;
  } catch {
    return {
      success: false,
      error: { code: "BAD_RESPONSE", message: "Invalid server response." },
    };
  }
}

/**
 * Public Kaify OTP APIs (same server path as web). No Bearer — cookies unused;
 * verify returns access/refresh tokens for Capacitor origins.
 */
async function publicAuthPost<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  const response = await fetch(`${__KAIFY_API_BASE__}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Client-Version": NATIVE_CLIENT_VERSION,
    },
    body: JSON.stringify(body),
  });
  const payload = await parseApiJson<T>(response);
  if (!response.ok || payload.success !== true) {
    const message =
      payload.success === false
        ? payload.error?.message || "Request failed."
        : `Request failed (${response.status}).`;
    return { ok: false, message };
  }
  return { ok: true, data: payload.data };
}

export async function sendNativeEmailOtp(
  email: string,
  locale: "tr" | "en" = "en",
): Promise<{ ok: true } | { ok: false; message: string }> {
  const result = await publicAuthPost<{ sent: true }>("/api/auth/otp/send", {
    email: email.trim().toLowerCase(),
    locale,
  });
  if (!result.ok) return result;
  return { ok: true };
}

export async function verifyNativeEmailOtp(
  email: string,
  token: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const normalized = normalizeOtpInput(token);
  if (!isCompleteOtp(normalized)) {
    return { ok: false, message: "Enter the 6-digit code from your email." };
  }

  const result = await publicAuthPost<{
    verified: true;
    session?: { accessToken: string; refreshToken: string };
  }>("/api/auth/otp/verify", {
    email: email.trim().toLowerCase(),
    token: normalized,
  });
  if (!result.ok) return result;

  const session = result.data.session;
  if (!session?.accessToken || !session.refreshToken) {
    return {
      ok: false,
      message:
        "Signed in on the server, but the app session was not returned. Please try again.",
    };
  }

  const { error } = await supabase.auth.setSession({
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
  });
  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

export { NATIVE_CLIENT_VERSION };
