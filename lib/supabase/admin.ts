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
export function createAdminSupabaseClient(): AdminSupabaseClient {
  assertServerRuntime("createAdminSupabaseClient");

  const { url, serviceRoleKey } = getSupabaseServerEnv();

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
