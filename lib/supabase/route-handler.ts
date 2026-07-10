import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

export type RouteHandlerSupabase = {
  supabase: SupabaseClient<Database>;
  /** Copy auth cookies set during Supabase calls onto the final API response. */
  withCookies: <T extends NextResponse>(response: T) => T;
};

/**
 * Supabase client for Route Handlers that must persist auth cookies on the
 * JSON response (verifyOtp, exchangeCodeForSession, etc.).
 */
export function createRouteHandlerSupabase(
  request: NextRequest,
): RouteHandlerSupabase {
  const { url, anonKey } = getSupabasePublicEnv();
  let cookieCarrier = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        cookieCarrier = NextResponse.next({
          request: { headers: request.headers },
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieCarrier.cookies.set(name, value, options);
        });
      },
    },
  });

  return {
    supabase,
    withCookies(response) {
      for (const cookie of cookieCarrier.cookies.getAll()) {
        response.cookies.set(cookie);
      }
      return response;
    },
  };
}
