import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import type { Database } from "@/lib/types/database.types";
import {
  assertServerRuntime,
  getSupabasePublicEnv,
} from "@/lib/supabase/env";

export type ServerSupabaseClient = SupabaseClient<Database>;

/**
 * Server Supabase client — cookie-backed session, anon key only.
 * Use in Server Components, Server Actions, and Route Handlers.
 */
export async function createServerSupabaseClient(): Promise<ServerSupabaseClient> {
  assertServerRuntime("createServerSupabaseClient");

  const { url, anonKey } = getSupabasePublicEnv();
  const authorization = (await headers()).get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return createClient<Database>(url, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // setAll can run from a Server Component where cookies are read-only.
          // Session refresh in middleware keeps auth cookies in sync.
        }
      },
    },
  });
}

/**
 * Resolves the authenticated user from the server session.
 * Returns null when unauthenticated or when the session is invalid.
 */
export async function getServerAuthUser(request?: Request): Promise<{
  id: string;
  email: string | undefined;
} | null> {
  const authorization =
    request?.headers.get("authorization")?.trim() ||
    (await headers()).get("authorization") ||
    "";
  const bearerToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? "";
  const { url, anonKey } = getSupabasePublicEnv();
  const supabase = bearerToken
    ? createClient<Database>(url, anonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      })
    : await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(bearerToken || undefined);

  if (error || !user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
  };
}
