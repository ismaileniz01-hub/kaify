"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { apiPost } from "@/lib/api/client";
import { clearPendingReferral, getPendingReferral } from "@/lib/referral";
import { tryCreateBrowserSupabaseClient } from "@/lib/supabase/client";

const SKIP_PREFIXES = ["/login", "/signup", "/privacy", "/terms", "/cookies", "/api/"];

/**
 * Applies a referral code captured before sign-up (e.g. ?ref= on landing).
 */
export function ReferralApplySync() {
  const pathname = usePathname();

  useEffect(() => {
    if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) return;

    void (async () => {
      const code = getPendingReferral();
      if (!code) return;

      const supabase = tryCreateBrowserSupabaseClient();
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;

      try {
        await apiPost("/api/referral", { code });
        clearPendingReferral();
      } catch {
        // Retry on next navigation
      }
    })();
  }, [pathname]);

  return null;
}
