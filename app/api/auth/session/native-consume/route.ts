import { NextRequest, NextResponse } from "next/server";
import { consumeNativeHandoffTicket } from "@/lib/auth/native-handoff-ticket";
import {
  nativeLoginErrorUrl,
  redirectNativeSession,
} from "@/lib/auth/native-session-redirect";
import { getClientIP } from "@/lib/api-security";
import { enforcePublicRateLimit } from "@/lib/api/rate-guard";
import { ApiError } from "@/lib/api/errors";

export const runtime = "nodejs";

/**
 * First-party document GET after native OTP.
 * WKWebView stores Set-Cookie on this navigation to kaifyai.org.
 * Ticket is a short id (or sealed blob), never the raw JWT in the hash.
 */
export async function GET(request: NextRequest) {
  try {
    await enforcePublicRateLimit(getClientIP(request), "otp_verify");
  } catch (error) {
    if (error instanceof ApiError && error.code === "RATE_LIMITED") {
      return NextResponse.redirect(nativeLoginErrorUrl(request), 303);
    }
  }

  const ticket = request.nextUrl.searchParams.get("ticket")?.trim() ?? "";
  const tokens = await consumeNativeHandoffTicket(ticket);
  if (!tokens) {
    return NextResponse.redirect(nativeLoginErrorUrl(request), 303);
  }

  try {
    return await redirectNativeSession(request, tokens);
  } catch {
    return NextResponse.redirect(nativeLoginErrorUrl(request), 303);
  }
}
