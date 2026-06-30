"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { getSupabasePublicEnv, SupabaseEnvError } from "@/lib/supabase/env";

export type BrowserSupabaseClient = SupabaseClient<Database>;

let browserClient: BrowserSupabaseClient | null = null;

/**
 * Browser Supabase client — anon key only.
 * Safe for Client Components; never import admin or service-role modules here.
 */
export function createBrowserSupabaseClient(): BrowserSupabaseClient {
  const { url, anonKey } = getSupabasePublicEnv();

  if (!browserClient) {
    browserClient = createBrowserClient<Database>(url, anonKey);
  }

  return browserClient;
}

/**
 * Returns the shared browser client, or null when public env is not configured yet.
 * Useful during local UI work before Supabase credentials are added.
 */
export function tryCreateBrowserSupabaseClient(): BrowserSupabaseClient | null {
  try {
    return createBrowserSupabaseClient();
  } catch (error) {
    if (error instanceof SupabaseEnvError) {
      return null;
    }
    throw error;
  }
}
