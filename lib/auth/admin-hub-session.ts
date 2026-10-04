import { cookies } from "next/headers";

export const ADMIN_HUB_COOKIE_NAME = "kaify_admin_hub";
const ADMIN_HUB_MAX_AGE_SEC = 60 * 60 * 8;

function isProductionRuntime(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  );
}

function isDeployedRuntime(): boolean {
  return (
    isProductionRuntime() ||
    process.env.VERCEL_ENV === "preview"
  );
}

function secureCookiesEnabled(): boolean {
  return isDeployedRuntime();
}

/**
 * Dedicated hub HMAC secret — never reuse SUPABASE_SERVICE_ROLE_KEY or CSRF_SECRET
 * in deployed environments. Local-only insecure default for tests/dev.
 */
function hubSecret(): string | null {
  const secret = process.env.ADMIN_HUB_SECRET?.trim() || "";
  if (secret && !secret.includes("your_")) return secret;
  if (isDeployedRuntime()) return null;
  return "dev-admin-hub-insecure";
}

/**
 * Operator hub password. Must be set via ADMIN_HUB_PASSWORD in every
 * environment (no hardcoded default — the previous default was public in source).
 */
export function adminHubPassword(): string | null {
  const password = process.env.ADMIN_HUB_PASSWORD?.trim() || "";
  if (password) return password;
  return null;
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
    throw new Error("ADMIN_HUB_SECRET is required in production/preview");
  }
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + ADMIN_HUB_MAX_AGE_SEC;
  const payload = `${userId}.${issuedAt}.${expiresAt}`;
  const sig = await hmacSha256Base64Url(secret, payload);
  return `${payload}.${sig}`;
}

async function parseAdminHubToken(
  token: string,
): Promise<{ userId: string; issuedAt: number; expiresAt: number } | null> {
  const secret = hubSecret();
  if (!secret) return null;

  const parts = token.split(".");
  let userId = "";
  let issuedAt = 0;
  let expiresRaw = "";
  let sig = "";
  if (parts.length === 4) {
    userId = parts[0] ?? "";
    issuedAt = Number(parts[1]);
    expiresRaw = parts[2] ?? "";
    sig = parts[3] ?? "";
    if (!Number.isFinite(issuedAt)) return null;
  } else if (parts.length === 3) {
    userId = parts[0] ?? "";
    expiresRaw = parts[1] ?? "";
    sig = parts[2] ?? "";
  } else {
    return null;
  }
  if (!userId || !expiresRaw || !sig) return null;

  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt)) return null;

  const payload =
    parts.length === 4 ? `${userId}.${issuedAt}.${expiresAt}` : `${userId}.${expiresAt}`;
  const expected = await hmacSha256Base64Url(secret, payload);
  if (!timingSafeEqualStrings(sig, expected)) return null;

  return { userId, issuedAt, expiresAt };
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

/**
 * Drop the hub cookie unless it was minted after this lock started.
 * A slow lock from page load must not erase the password the operator just entered.
 */
export async function clearAdminHubSessionIfNotNewer(startedAtSec: number): Promise<void> {
  const jar = await cookies();
  const token = jar.get(ADMIN_HUB_COOKIE_NAME)?.value;
  if (!token) return;
  const parsed = await parseAdminHubToken(token);
  if (parsed && parsed.issuedAt >= startedAtSec && parsed.issuedAt > 0) return;
  jar.delete(ADMIN_HUB_COOKIE_NAME);
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
    secure: secureCookiesEnabled(),
    path: "/",
    maxAge: ADMIN_HUB_MAX_AGE_SEC,
  };
}
