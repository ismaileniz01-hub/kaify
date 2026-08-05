"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { tryCreateBrowserSupabaseClient } from "@/lib/supabase/client";
import { getMfaAssurance } from "@/lib/auth/mfa";

const MFA_VERIFY_PATH = "/login/mfa";
const PUBLIC_PREFIXES = ["/login", "/signup", "/api/auth"];

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

        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          setChecked(true);
          return;
        }

        const assurance = await getMfaAssurance(supabase);
        if (assurance.verificationRequired && pathname !== MFA_VERIFY_PATH) {
          router.replace(MFA_VERIFY_PATH);
          return;
        }
      } catch {
        // Fail closed — ambiguous MFA state requires verification.
        const supabase = tryCreateBrowserSupabaseClient();
        const { data: userData } = supabase
          ? await supabase.auth.getUser()
          : { data: { user: null } };
        if (userData.user && pathname !== MFA_VERIFY_PATH) {
          router.replace(MFA_VERIFY_PATH);
          return;
        }
      } finally {
        setChecked(true);
      }
    })();
  }, [checked, pathname, router]);

  return null;
}
