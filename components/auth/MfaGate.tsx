"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { tryCreateBrowserSupabaseClient } from "@/lib/supabase/client";
import { getMfaAssurance } from "@/lib/auth/mfa";

const MFA_VERIFY_PATH = "/login/mfa";
const PUBLIC_PREFIXES = ["/login", "/api/auth"];

/**
 * Redirects authenticated users with pending MFA verification to /login/mfa.
 * Mount once near the app root (layout).
 */
export function MfaGate() {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (checked) return;
    if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
      setChecked(true);
      return;
    }

    void (async () => {
      try {
        const supabase = tryCreateBrowserSupabaseClient();
        if (!supabase) {
          setChecked(true);
          return;
        }

        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          setChecked(true);
          return;
        }

        const assurance = await getMfaAssurance(supabase);
        if (assurance.verificationRequired && pathname !== MFA_VERIFY_PATH) {
          router.replace(MFA_VERIFY_PATH);
          return;
        }
      } catch {
        // Fail open — do not lock users out on MFA check errors.
      } finally {
        setChecked(true);
      }
    })();
  }, [checked, pathname, router]);

  return null;
}
