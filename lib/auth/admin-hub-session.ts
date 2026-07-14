import { cookies } from "next/headers";

export const ADMIN_HUB_COOKIE_NAME = "kaify_admin_hub";
const ADMIN_HUB_MAX_AGE_SEC = 60 * 60 * 8;

function isProductionRuntime(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  );
}

/** Returns the hub HMAC secret, or null when production is misconfigured. */
function hubSecret(): string | null {
  const secret =
    process.env.ADMIN_HUB_SECRET?.trim() ||
    process.env.CSRF_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "";
  if (secret) return secret;
  if (isProductionRuntime()) return null;
  return "dev-admin-hub-insecure";
}

/** Returns the hub password, or null when production is misconfigured. */
export function adminHubPassword(): string | null {
  const password = process.env.ADMIN_HUB_PASSWORD?.trim() || "";
  if (password) return password;
  if (isProductionRuntime()) return null;
  return "isoisking";
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
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

export function verifyAdminHubPassword(password: string): boolean {
  const expected = adminHubPassword();
  if (!expected) return false;
  return timingSafeEqualStrings(password, expected);
}

export async function mintAdminHubToken(userId: string): Promise<string> {
  const secret = hubSecret();
  if (!secret) {
    throw new Error("ADMIN_HUB_SECRET (or CSRF_SECRET) is required in production");
  }
  const expiresAt = Math.floor(Date.now() / 1000) + ADMIN_HUB_MAX_AGE_SEC;
  const payload = `${userId}.${expiresAt}`;
  const sig = await hmacSha256Base64Url(secret, payload);
  return `${payload}.${sig}`;
}

async function parseAdminHubToken(token: string): Promise<{ userId: string; expiresAt: number } | null> {
  const secret = hubSecret();
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expiresRaw, sig] = parts;
  if (!userId || !expiresRaw || !sig) return null;

  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt)) return null;

  const payload = `${userId}.${expiresAt}`;
  const expected = await hmacSha256Base64Url(secret, payload);
  if (!timingSafeEqualStrings(sig, expected)) return null;

  return { userId, expiresAt };
}

export async function verifyAdminHubSession(userId: string): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(ADMIN_HUB_COOKIE_NAME)?.value;
  if (!token) return false;

  const parsed = await parseAdminHubToken(token);
  if (!parsed) return false;
  if (parsed.userId !== userId) return false;
  if (parsed.expiresAt < Math.floor(Date.now() / 1000)) return false;

  return true;
}

export function adminHubCookieOptions(): {
  httpOnly: boolean;
  sameSite: "strict";
  secure: boolean;
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_HUB_MAX_AGE_SEC,
  };
}
