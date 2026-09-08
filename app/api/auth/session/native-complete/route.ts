import { NextRequest, NextResponse } from "next/server";
import { nativeSessionEstablishSchema } from "@/lib/validations/auth-otp.schema";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import {
  NATIVE_SESSION_HINT_COOKIE,
  nativeEntryShellUrl,
} from "@/lib/native/native-entry-boot";
import { getClientIP } from "@/lib/api-security";
import { enforcePublicRateLimit } from "@/lib/api/rate-guard";
import { ApiError } from "@/lib/api/errors";

export const runtime = "nodejs";

/**
 * Top-level form POST from /login/native-entry.
 * WKWebView stores Set-Cookie on document navigations; it often drops
 * Set-Cookie from fetch/XHR. Do not convert this to JSON fetch.
 */

function welcomeUrl(request: NextRequest): URL {
  return new URL("/welcome", request.url);
}

function loginErrorUrl(request: NextRequest): URL {
  const shell = nativeEntryShellUrl(request.headers.get("user-agent") ?? "");
  if (shell.startsWith("capacitor:") || shell.startsWith("https://localhost")) {
    return new URL(shell);
  }
  return new URL("/login?native_session=0", request.url);
}

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
      return NextResponse.redirect(loginErrorUrl(request), 303);
    }
  }

  const parsed = await parseTokens(request);
  if (!parsed.success) {
    return NextResponse.redirect(loginErrorUrl(request), 303);
  }

  try {
    const { supabase, withCookies } = createRouteHandlerSupabase(request);
    const { error } = await supabase.auth.setSession({
      access_token: parsed.data.accessToken,
      refresh_token: parsed.data.refreshToken,
    });
    if (error) {
      return NextResponse.redirect(loginErrorUrl(request), 303);
    }
    const redirect = NextResponse.redirect(welcomeUrl(request), 303);
    withCookies(redirect);
    redirect.cookies.set(NATIVE_SESSION_HINT_COOKIE, "1", {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
      secure: true,
      httpOnly: false,
    });
    redirect.headers.set("Cache-Control", "private, no-store");
    return redirect;
  } catch {
    return NextResponse.redirect(loginErrorUrl(request), 303);
  }
}

export function GET(request: NextRequest) {
  return NextResponse.redirect(loginErrorUrl(request), 303);
}
