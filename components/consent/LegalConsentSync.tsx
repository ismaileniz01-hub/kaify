"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { apiPost } from "@/lib/api/client";
import {
  CONSENT_TYPES,
  PENDING_LEGAL_CONSENT_KEY,
  type PendingLegalConsent,
  PRIVACY_VERSION,
  TERMS_VERSION,
} from "@/lib/legal/constants";
import { tryCreateBrowserSupabaseClient } from "@/lib/supabase/client";

const SKIP_PREFIXES = ["/login", "/signup", "/privacy", "/terms", "/cookies", "/api/"];

/**
 * After login, persists clickwrap acceptance from localStorage into consent_records.
 */
export function LegalConsentSync() {
  const pathname = usePathname();

  useEffect(() => {
    if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) return;

    void (async () => {
      const raw = localStorage.getItem(PENDING_LEGAL_CONSENT_KEY);
      if (!raw) return;

      let pending: PendingLegalConsent;
      try {
        pending = JSON.parse(raw) as PendingLegalConsent;
      } catch {
        localStorage.removeItem(PENDING_LEGAL_CONSENT_KEY);
        return;
      }

      if (
        pending.termsVersion !== TERMS_VERSION ||
        pending.privacyVersion !== PRIVACY_VERSION
      ) {
        localStorage.removeItem(PENDING_LEGAL_CONSENT_KEY);
        return;
      }

      const supabase = tryCreateBrowserSupabaseClient();
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;

      try {
        await apiPost("/api/consent", {
          consentType: CONSENT_TYPES.TERMS_PRIVACY,
          metadata: {
            termsVersion: pending.termsVersion,
            privacyVersion: pending.privacyVersion,
            acceptedAt: pending.acceptedAt,
            source: "login_clickwrap",
          },
        });
        localStorage.removeItem(PENDING_LEGAL_CONSENT_KEY);
      } catch {
        // Retry on next navigation
      }
    })();
  }, [pathname]);

  return null;
}
