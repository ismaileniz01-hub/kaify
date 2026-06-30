import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
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
export async function getServerAuthUser(): Promise<{
  id: string;
  email: string | undefined;
} | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
  };
}
