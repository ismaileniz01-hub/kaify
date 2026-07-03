import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import {
  assertServerRuntime,
  getSupabaseServerEnv,
} from "@/lib/supabase/env";

export type AdminSupabaseClient = SupabaseClient<Database>;

/**
 * Service-role Supabase client — bypasses RLS.
 *
 * SECURITY:
 * - Server-only. Never import this module from Client Components.
 * - Use only for trusted server operations (RPC, webhooks, cron, admin APIs).
 * - Prefer createServerSupabaseClient() for user-scoped requests.
 */
let cachedAdminClient: AdminSupabaseClient | null = null;

export function createAdminSupabaseClient(): AdminSupabaseClient {
  assertServerRuntime("createAdminSupabaseClient");

  // The service-role client holds no per-request state (no session, no cookies),
  // so it is safe to memoize at module scope. This avoids re-instantiating the
  // client (and its fetch/config setup) on every call — including hot paths and
  // loops — which matters under load.
  if (cachedAdminClient) return cachedAdminClient;

  const { url, serviceRoleKey } = getSupabaseServerEnv();

  cachedAdminClient = createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedAdminClient;
}
