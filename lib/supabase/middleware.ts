import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database.types";
import {
  getSupabasePublicEnv,
  SupabaseEnvError,
} from "@/lib/supabase/env";

export type MiddlewareSupabaseClient = SupabaseClient<Database>;

export type SupabaseSessionRefreshResult = {
  response: NextResponse;
  user: User | null;
};

/**
 * Refreshes the Supabase auth session and syncs cookies on the edge response.
 * Call this from the root middleware.ts before returning NextResponse.next().
 */
export async function updateSupabaseSession(
  request: NextRequest,
): Promise<SupabaseSessionRefreshResult> {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  let user: User | null = null;

  try {
    const { url, anonKey } = getSupabasePublicEnv();

    const supabase = createServerClient<Database>(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const {
      data: { user: authenticatedUser },
    } = await supabase.auth.getUser();

    user = authenticatedUser;
  } catch (error) {
    if (!(error instanceof SupabaseEnvError)) {
      throw error;
    }
    // Supabase is not configured yet — continue without session refresh.
  }

  return { response, user };
}
