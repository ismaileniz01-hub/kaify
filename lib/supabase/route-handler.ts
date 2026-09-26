import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

type AuthCookie = { name: string; value: string; options: CookieOptions };

export type RouteHandlerSupabase = {
  supabase: SupabaseClient<Database>;
  /** Copy auth cookies set during Supabase calls onto the final API response. */
  withCookies: <T extends NextResponse>(response: T) => T;
};

/** Apply Set-Cookie options (httpOnly, maxAge, sameSite) — getAll() drops them. */
export function applyAuthCookies(
  response: NextResponse,
  cookies: AuthCookie[],
): void {
  for (const { name, value, options } of cookies) {
    response.cookies.set(name, value, options);
  }
}

/**
 * Supabase client for Route Handlers that must persist auth cookies on the
 * JSON response (verifyOtp, exchangeCodeForSession, etc.).
 */
export function createRouteHandlerSupabase(
  request: NextRequest,
): RouteHandlerSupabase {
  const { url, anonKey } = getSupabasePublicEnv();
  let pendingCookies: AuthCookie[] = [];

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        pendingCookies = cookiesToSet.map(({ name, value, options }) => ({
          name,
          value,
          options,
        }));
      },
    },
  });

  return {
    supabase,
    withCookies(response) {
      applyAuthCookies(response, pendingCookies);
      return response;
    },
  };
}
