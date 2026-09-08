import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import {
  NATIVE_SESSION_HINT_COOKIE,
  nativeEntryShellUrl,
} from "@/lib/native/native-entry-boot";

export function nativeWelcomeUrl(request: NextRequest): URL {
  return new URL("/welcome?native_handoff=1", request.url);
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
  const redirect = NextResponse.redirect(nativeWelcomeUrl(request), 303);
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
