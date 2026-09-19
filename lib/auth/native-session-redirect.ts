import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import {
  NATIVE_BEARER_COOKIE,
  NATIVE_BEARER_COOKIE_MAX_AGE_SEC,
  NATIVE_SESSION_HINT_COOKIE,
  encodeNativeBearerCookieValue,
  nativeEntryShellUrl,
  nativeSessionHandoffHtml,
} from "@/lib/native/native-entry-boot";

/** Home after a successful native session establish (query-only fallback). */
export function nativeWelcomeUrl(request: NextRequest): URL {
  return new URL("/welcome?native_handoff=1", request.url);
}

/**
 * Legacy hash handoff via native-entry. Prefer consume HTML —
 * WKWebView often drops Location fragments on 303 redirects.
 */
export function nativeEntryHandoffUrl(
  request: NextRequest,
  tokens: { accessToken: string; refreshToken: string },
): URL {
  const url = new URL("/login/native-entry", request.url);
  url.hash = new URLSearchParams({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    token_type: "bearer",
  }).toString();
  return url;
}

export function nativeLoginErrorUrl(request: NextRequest): URL {
  const shell = nativeEntryShellUrl(request.headers.get("user-agent") ?? "");
  if (shell.startsWith("capacitor:") || shell.startsWith("https://localhost")) {
    return new URL(shell);
  }
  return new URL("/login?native_session=0", request.url);
}

function attachNativeSessionCookies(
  response: NextResponse,
  tokens: { accessToken: string; refreshToken: string },
): void {
  response.cookies.set(NATIVE_SESSION_HINT_COOKIE, "1", {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
    secure: true,
    httpOnly: false,
  });
  const bearer = encodeNativeBearerCookieValue(tokens);
  // Safari/WKWebView silently drops cookies over ~4KB; skip rather than lose the jar.
  if (bearer.length < 3500) {
    response.cookies.set(NATIVE_BEARER_COOKIE, bearer, {
      path: "/",
      maxAge: NATIVE_BEARER_COOKIE_MAX_AGE_SEC,
      sameSite: "lax",
      secure: true,
      httpOnly: false,
    });
  }
  response.headers.set("Cache-Control", "private, no-store");
}

export async function redirectNativeSession(
  request: NextRequest,
  tokens: { accessToken: string; refreshToken: string },
): Promise<NextResponse> {
  const { supabase, withCookies } = createRouteHandlerSupabase(request);
  const { error } = await supabase.auth.setSession({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });
  if (error) {
    return NextResponse.redirect(nativeLoginErrorUrl(request), 303);
  }
  const html = nativeSessionHandoffHtml(tokens);
  const document = new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
  withCookies(document);
  attachNativeSessionCookies(document, tokens);
  return document;
}
