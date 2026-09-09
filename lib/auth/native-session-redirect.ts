import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import {
  NATIVE_SESSION_HINT_COOKIE,
  nativeEntryShellUrl,
} from "@/lib/native/native-entry-boot";

/** Legacy direct Home URL — prefer nativeEntryHandoffUrl so Bearer lands in storage. */
export function nativeWelcomeUrl(request: NextRequest): URL {
  return new URL("/welcome?native_handoff=1", request.url);
}

/**
 * First-party hash handoff on kaifyai.org. Boot script stores tokens then opens Home.
 * WKWebView often drops httpOnly cookies after OTP; Bearer in origin storage is the backup.
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
  const redirect = NextResponse.redirect(
    nativeEntryHandoffUrl(request, tokens),
    303,
  );
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
}
