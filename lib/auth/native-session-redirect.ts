import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import {
  NATIVE_BEARER_COOKIE,
  NATIVE_BEARER_COOKIE_MAX_AGE_SEC,
  NATIVE_SESSION_HINT_COOKIE,
  encodeNativeBearerCookieValue,
  nativeEntryShellUrl,
} from "@/lib/native/native-entry-boot";

/** Home after a successful native session establish. */
export function nativeWelcomeUrl(request: NextRequest): URL {
  return new URL("/welcome?native_handoff=1", request.url);
}

/**
 * Legacy hash handoff via native-entry. Prefer welcome + bearer cookie —
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
  // Direct Home — bearer cookie carries JWTs when httpOnly sb-* cookies are dropped.
  const redirect = NextResponse.redirect(nativeWelcomeUrl(request), 303);
  withCookies(redirect);
  redirect.cookies.set(NATIVE_SESSION_HINT_COOKIE, "1", {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
    secure: true,
    httpOnly: false,
  });
  redirect.cookies.set(
    NATIVE_BEARER_COOKIE,
    encodeNativeBearerCookieValue(tokens),
    {
      path: "/",
      maxAge: NATIVE_BEARER_COOKIE_MAX_AGE_SEC,
      sameSite: "lax",
      secure: true,
      httpOnly: false,
    },
  );
  redirect.headers.set("Cache-Control", "private, no-store");
  return redirect;
}
