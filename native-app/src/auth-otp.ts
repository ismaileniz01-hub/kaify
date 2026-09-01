import { isCompleteOtp, normalizeOtpInput } from "@/lib/auth/otp";
import { DEFAULT_RESEND_AFTER_SECONDS } from "./otp-resend-timer";
import { NATIVE_CLIENT_VERSION } from "./client-version";
import { supabase } from "./session";

export { NATIVE_CLIENT_VERSION };

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = {
  success: false;
  error?: { code?: string; message?: string; details?: unknown };
};

export type NativeOtpSendSuccess = {
  ok: true;
  resendAfterSeconds: number;
};

export type NativeOtpFailure = {
  ok: false;
  message: string;
  code?: string;
  retryAfterSeconds?: number;
};

function friendlyNetworkMessage(raw: string, fallback: string): string {
  return /load failed|failed to fetch|networkerror|the internet connection appears to be offline/i.test(
    raw,
  )
    ? "Bağlantı hatası. İnternetini kontrol edip tekrar dene."
    : fallback || raw;
}

async function parseApiJson<T>(
  response: Response,
): Promise<ApiSuccess<T> | ApiFailure> {
  try {
    return (await response.json()) as ApiSuccess<T> | ApiFailure;
  } catch {
    return {
      success: false,
      error: { code: "BAD_RESPONSE", message: "Sunucu yanıtı okunamadı." },
    };
  }
}

function readRetryAfterSeconds(response: Response, payload: ApiFailure): number | undefined {
  const header = response.headers.get("Retry-After");
  if (header) {
    const n = Number(header);
    if (Number.isFinite(n) && n > 0) return Math.ceil(n);
  }
  const details = payload.error?.details as
    | { retryAfterSeconds?: unknown; retryAfterMs?: unknown; resendAfterSeconds?: unknown }
    | undefined;
  if (typeof details?.retryAfterSeconds === "number" && details.retryAfterSeconds > 0) {
    return Math.ceil(details.retryAfterSeconds);
  }
  if (typeof details?.resendAfterSeconds === "number" && details.resendAfterSeconds > 0) {
    return Math.ceil(details.resendAfterSeconds);
  }
  if (typeof details?.retryAfterMs === "number" && details.retryAfterMs > 0) {
    return Math.max(1, Math.ceil(details.retryAfterMs / 1000));
  }
  return undefined;
}

function mapSendErrorMessage(code: string | undefined, fallback: string): string {
  switch (code) {
    case "OTP_RESEND_COOLDOWN":
      return "Yeni kod istemeden önce lütfen biraz bekle.";
    case "RATE_LIMITED":
      return "Çok hızlı istek gönderdin. Lütfen biraz bekle.";
    case "FORBIDDEN":
      return "Güvenlik doğrulaması başarısız. Lütfen tekrar dene.";
    case "SERVICE_UNAVAILABLE":
      return "Kimlik doğrulama şu an kullanılamıyor. Lütfen sonra tekrar dene.";
    default:
      return fallback || "Kod gönderilemedi. Lütfen tekrar dene.";
  }
}

/**
 * Public Kaify OTP APIs (same server path as web). No Bearer — cookies unused;
 * verify returns access/refresh tokens for Capacitor origins.
 * No captcha token — backend skips captcha for native client versions/origins.
 */
async function publicAuthPost<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<
  | { ok: true; data: T }
  | { ok: false; message: string; code?: string; retryAfterSeconds?: number }
> {
  let response: Response;
  try {
    response = await fetch(`${__KAIFY_API_BASE__}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Client-Version": NATIVE_CLIENT_VERSION,
      },
      body: JSON.stringify(body),
    });
  } catch (cause) {
    const raw = cause instanceof Error ? cause.message : "";
    return {
      ok: false,
      message: friendlyNetworkMessage(
        raw,
        "Bağlantı hatası. İnternetini kontrol edip tekrar dene.",
      ),
      code: "NETWORK_ERROR",
    };
  }

  const payload = await parseApiJson<T>(response);
  if (!response.ok || payload.success !== true) {
    const code = payload.success === false ? payload.error?.code : undefined;
    const fallback =
      payload.success === false
        ? payload.error?.message || "İstek başarısız."
        : `İstek başarısız (${response.status}).`;
    return {
      ok: false,
      message: mapSendErrorMessage(code, fallback),
      code,
      retryAfterSeconds:
        payload.success === false
          ? readRetryAfterSeconds(response, payload)
          : undefined,
    };
  }
  return { ok: true, data: payload.data };
}

export async function sendNativeEmailOtp(
  email: string,
  locale: "tr" | "en" = "en",
): Promise<NativeOtpSendSuccess | NativeOtpFailure> {
  const result = await publicAuthPost<{
    sent: true;
    resendAfterSeconds?: number;
  }>("/api/auth/otp/send", {
    email: email.trim().toLowerCase(),
    locale,
  });
  if (!result.ok) return result;
  const resendAfterSeconds =
    typeof result.data.resendAfterSeconds === "number" &&
    result.data.resendAfterSeconds > 0
      ? Math.ceil(result.data.resendAfterSeconds)
      : DEFAULT_RESEND_AFTER_SECONDS;
  return { ok: true, resendAfterSeconds };
}

export async function signInNativeWithPassword(
  email: string,
  password: string,
): Promise<
  | { ok: true; accessToken: string; refreshToken: string }
  | NativeOtpFailure
> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed.includes("@") || password.length < 8) {
    return { ok: false, message: "Enter your email and password." };
  }

  const result = await publicAuthPost<{
    verified: true;
    session?: { accessToken: string; refreshToken: string };
  }>("/api/auth/password", {
    email: trimmed,
    password,
  });
  if (!result.ok) {
    return {
      ok: false,
      message:
        result.code === "UNAUTHORIZED"
          ? "Invalid email or password."
          : result.message || "Sign-in failed. Please try again.",
      code: result.code,
    };
  }

  const session = result.data.session;
  if (!session?.accessToken || !session.refreshToken) {
    return {
      ok: false,
      message:
        "Sunucu girişi tamamladı ama uygulama oturumu dönmedi. Lütfen tekrar dene.",
    };
  }

  const { error } = await supabase.auth.setSession({
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
  });
  if (error) {
    return {
      ok: false,
      message: friendlyNetworkMessage(
        error.message,
        error.message || "Oturum kaydedilemedi. Lütfen tekrar dene.",
      ),
    };
  }
  return {
    ok: true,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  };
}

export async function verifyNativeEmailOtp(
  email: string,
  token: string,
): Promise<
  | { ok: true; accessToken: string; refreshToken: string }
  | NativeOtpFailure
> {
  const normalized = normalizeOtpInput(token);
  if (!isCompleteOtp(normalized)) {
    return { ok: false, message: "E-postandaki 6 haneli kodu gir." };
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
        "Sunucu girişi tamamladı ama uygulama oturumu dönmedi. Lütfen tekrar dene.",
    };
  }

  const { error } = await supabase.auth.setSession({
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
  });
  if (error) {
    return {
      ok: false,
      message: friendlyNetworkMessage(
        error.message,
        error.message || "Oturum kaydedilemedi. Lütfen tekrar dene.",
      ),
    };
  }
  return {
    ok: true,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  };
}
