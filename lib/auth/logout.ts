import { clearKaiLocalCache } from "@/lib/kai-context";
import { clearStoredNativeToken } from "@/lib/push/native-token-store";
import { tryCreateBrowserSupabaseClient } from "@/lib/supabase/client";
import { clearAnalyticsCache } from "@/lib/analytics-client-cache";
import { returnToNativeLoginShell } from "@/lib/native/sign-out-native";

/** Remembers email between OTP send and verify on /login. */
export const PENDING_OTP_EMAIL_KEY = "kaify-pending-otp-email";
const STREAK_CLAIMED_MILESTONES_KEY = "streak_claimed_milestones";
const STREAK_CLAIMED_STATIONS_KEY = "streak_claimed_stations";

/** Clears client-side auth helpers (not the Supabase cookie session). */
export function clearAuthLocalState(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PENDING_OTP_EMAIL_KEY);
  localStorage.removeItem(STREAK_CLAIMED_MILESTONES_KEY);
  localStorage.removeItem(STREAK_CLAIMED_STATIONS_KEY);
  clearAnalyticsCache();
  clearStoredNativeToken();
  clearKaiLocalCache();
}

/** Ends the Supabase session and clears local auth state. */
export async function signOutUser(): Promise<{ ok: true } | { ok: false; message: string }> {
  clearAuthLocalState();

  let cookieCleared = false;
  if (typeof window !== "undefined") {
    try {
      const response = await fetch("/api/auth/session/logout", {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      cookieCleared = response.ok;
    } catch {
      cookieCleared = false;
    }
  }

  const supabase = tryCreateBrowserSupabaseClient();
  if (supabase) {
    try {
      await Promise.race([
        supabase.auth.signOut({ scope: "local" }),
        new Promise<void>((resolve) => {
          window.setTimeout(resolve, 1200);
        }),
      ]);
    } catch {
      // Cookie clear above is enough to stay signed out.
    }
  } else if (!cookieCleared && typeof window !== "undefined") {
    return { ok: false, message: "Auth is not configured." };
  }

  if (typeof window !== "undefined") {
    await returnToNativeLoginShell();
  }

  return { ok: true };
}
