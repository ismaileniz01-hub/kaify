import { createHmac, timingSafeEqual } from "crypto";
import { type NextRequest, type NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireMfaIfEnrolled } from "@/lib/auth/mfa-server";

export const STEP_UP_COOKIE = "kaify_stepup";
/** Fresh login or OTP step-up is valid for this long. */
export const STEP_UP_TTL_MS = 10 * 60 * 1000;

function isDeployedRuntime(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production" ||
    process.env.VERCEL_ENV === "preview"
  );
}

function stepUpSecret(): string {
  const secret = process.env.CSRF_SECRET?.trim() || "";
  if (secret && !secret.includes("your_")) return secret;
  if (isDeployedRuntime()) {
    throw new Error("CSRF_SECRET is required for step-up cookies");
  }
  return "dev-csrf-insecure";
}

function sign(payload: string): string {
  return createHmac("sha256", stepUpSecret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Mint a short-lived step-up token bound to the user id. */
export function mintStepUpToken(userId: string, now = Date.now()): string {
  const exp = now + STEP_UP_TTL_MS;
  const payload = `${userId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyStepUpToken(
  token: string,
  userId: string,
  now = Date.now(),
): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [uid, expRaw, sig] = parts;
  if (!uid || !expRaw || !sig) return false;
  if (uid !== userId) return false;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < now) return false;
  const payload = `${uid}.${expRaw}`;
  return safeEqual(sig, sign(payload));
}

export function readStepUpCookie(request: NextRequest): string | undefined {
  return request.cookies.get(STEP_UP_COOKIE)?.value;
}

export function hasValidStepUpCookie(
  request: NextRequest,
  userId: string,
): boolean {
  const token = readStepUpCookie(request);
  if (!token) return false;
  return verifyStepUpToken(token, userId);
}

export function attachStepUpCookie(
  response: NextResponse,
  userId: string,
): NextResponse {
  response.cookies.set(STEP_UP_COOKIE, mintStepUpToken(userId), {
    httpOnly: true,
    sameSite: "strict",
    secure: isDeployedRuntime(),
    path: "/",
    maxAge: Math.floor(STEP_UP_TTL_MS / 1000),
  });
  return response;
}

async function hasFreshSignIn(userId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || data.user.id !== userId) return false;
  const last = data.user.last_sign_in_at
    ? Date.parse(data.user.last_sign_in_at)
    : 0;
  if (!Number.isFinite(last) || last <= 0) return false;
  return Date.now() - last <= STEP_UP_TTL_MS;
}

/**
 * Destructive / export step-up:
 * - MFA enrolled → AAL2 required
 * - Otherwise → recent sign-in OR valid step-up OTP cookie
 */
export async function requireSensitiveActionAuth(
  user: { id: string },
  request: NextRequest,
): Promise<void> {
  await requireMfaIfEnrolled();

  const supabase = await createServerSupabaseClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const hasTotp = (factors?.totp ?? []).some((f) => f.status === "verified");
  if (hasTotp) {
    // AAL2 already enforced by requireMfaIfEnrolled.
    return;
  }

  if (hasValidStepUpCookie(request, user.id)) return;
  if (await hasFreshSignIn(user.id)) return;

  throw new ApiError(
    "STEP_UP_REQUIRED",
    "Bu işlem için e-posta doğrulaması gerekir.",
    { reason: "STEP_UP_REQUIRED" },
  );
}
