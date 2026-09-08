import { NextRequest, NextResponse } from "next/server";
import { nativeSessionEstablishSchema } from "@/lib/validations/auth-otp.schema";
import {
  nativeLoginErrorUrl,
  redirectNativeSession,
} from "@/lib/auth/native-session-redirect";
import { getClientIP } from "@/lib/api-security";
import { enforcePublicRateLimit } from "@/lib/api/rate-guard";
import { ApiError } from "@/lib/api/errors";

export const runtime = "nodejs";

/**
 * Top-level form POST from older native-entry pages.
 * New iOS builds consume a one-time ticket via GET /native-consume instead.
 */

async function parseTokens(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => null);
    return nativeSessionEstablishSchema.safeParse(body);
  }
  const form = await request.formData().catch(() => null);
  if (!form) return nativeSessionEstablishSchema.safeParse({});
  return nativeSessionEstablishSchema.safeParse({
    accessToken: String(form.get("accessToken") ?? ""),
    refreshToken: String(form.get("refreshToken") ?? ""),
  });
}

export async function POST(request: NextRequest) {
  try {
    await enforcePublicRateLimit(getClientIP(request), "otp_verify");
  } catch (error) {
    if (error instanceof ApiError && error.code === "RATE_LIMITED") {
      return NextResponse.redirect(nativeLoginErrorUrl(request), 303);
    }
  }

  const parsed = await parseTokens(request);
  if (!parsed.success) {
    return NextResponse.redirect(nativeLoginErrorUrl(request), 303);
  }

  try {
    return await redirectNativeSession(request, parsed.data);
  } catch {
    return NextResponse.redirect(nativeLoginErrorUrl(request), 303);
  }
}

export function GET(request: NextRequest) {
  return NextResponse.redirect(nativeLoginErrorUrl(request), 303);
}
