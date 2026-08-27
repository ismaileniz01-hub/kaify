import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/** Exact Capacitor shell origins allowed for public OTP APIs (no wildcards). */
export const NATIVE_OTP_ORIGINS = [
  "capacitor://localhost",
  "https://localhost",
] as const;

export function isNativeOtpOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return (NATIVE_OTP_ORIGINS as readonly string[]).includes(origin);
}

/**
 * Captcha gate for OTP send.
 * Exact native OTP origins skip web reCAPTCHA (flow selection only — not a
 * security proof). Web and all other origins keep existing v2 validation.
 * Rate limits always apply regardless of captcha path.
 *
 * Kept out of `app/api/.../route.ts` so Next.js route type checks stay valid.
 */
export function shouldSkipOtpCaptchaForNativeOrigin(
  origin: string | null,
): boolean {
  return isNativeOtpOrigin(origin);
}

export function isNativeOtpPath(pathname: string): boolean {
  return (
    pathname === "/api/auth/otp/send" || pathname === "/api/auth/otp/verify"
  );
}

/**
 * Attach exact-origin CORS for native OTP requests on every response status.
 * No-op when Origin is missing or not on the OTP allowlist.
 */
export function applyNativeOtpCorsHeaders(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  const origin = request.headers.get("origin");
  if (!isNativeOtpOrigin(origin)) return response;

  response.headers.set("Access-Control-Allow-Origin", origin!);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, Idempotency-Key, X-Client-Version, X-CSRF-Token, x-csrf-token",
  );
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  response.headers.append("Vary", "Origin");
  return response;
}

export function isNativeOtpRequest(request: NextRequest, pathname: string): boolean {
  return isNativeOtpPath(pathname) && isNativeOtpOrigin(request.headers.get("origin"));
}
