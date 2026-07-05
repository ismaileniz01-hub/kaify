import { type NextRequest, type NextResponse } from "next/server";
import { CSRF_COOKIE_NAME } from "@/lib/security/csrf-client";

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@/lib/security/csrf-client";

const CSRF_MAX_AGE_SEC = 60 * 60 * 12;

function csrfSecret(): string {
  const secret =
    process.env.CSRF_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "dev-csrf-insecure";
  if (
    process.env.NODE_ENV === "production" &&
    (secret.includes("your_") || secret === "dev-csrf-insecure")
  ) {
    throw new Error("CSRF_SECRET or SUPABASE_SERVICE_ROLE_KEY required in production");
  }
  return secret;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacSha256Base64Url(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return toBase64Url(new Uint8Array(sig));
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const left = enc.encode(a);
  const right = enc.encode(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left[i] ^ right[i];
  return diff === 0;
}

/** Creates a random CSRF token bound to an HMAC for tamper detection. */
export async function mintCsrfToken(): Promise<string> {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  const nonce = toBase64Url(bytes);
  const sig = await hmacSha256Base64Url(csrfSecret(), nonce);
  return `${nonce}.${sig}`;
}

async function verifyCsrfToken(token: string): Promise<boolean> {
  const [nonce, sig] = token.split(".");
  if (!nonce || !sig) return false;
  const expected = await hmacSha256Base64Url(csrfSecret(), nonce);
  return timingSafeEqualStrings(sig, expected);
}

export function csrfCookieOptions(): {
  httpOnly: boolean;
  sameSite: "strict";
  secure: boolean;
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: false,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CSRF_MAX_AGE_SEC,
  };
}

/** Attach CSRF cookie when missing (double-submit pattern). Edge-safe. */
export async function attachCsrfCookie(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  const existing = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  if (existing && (await verifyCsrfToken(existing))) {
    return response;
  }
  response.cookies.set(CSRF_COOKIE_NAME, await mintCsrfToken(), csrfCookieOptions());
  return response;
}

export async function verifyCsrfPair(cookieToken: string, headerToken: string): Promise<boolean> {
  if (!cookieToken || !headerToken) return false;
  if (!(await verifyCsrfToken(cookieToken))) return false;
  return timingSafeEqualStrings(cookieToken, headerToken);
}
