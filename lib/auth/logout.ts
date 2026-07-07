import { clearKaiLocalCache } from "@/lib/kai-context";
import { clearStoredNativeToken } from "@/lib/push/native-token-store";
import { tryCreateBrowserSupabaseClient } from "@/lib/supabase/client";

/** Remembers email between OTP send and verify on /login. */
export const PENDING_OTP_EMAIL_KEY = "kaify-pending-otp-email";

/** Clears client-side auth helpers (not the Supabase cookie session). */
export function clearAuthLocalState(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PENDING_OTP_EMAIL_KEY);
  clearStoredNativeToken();
  clearKaiLocalCache();
}

/** Ends the Supabase session and clears local auth state. */
export async function signOutUser(): Promise<{ ok: true } | { ok: false; message: string }> {
  clearAuthLocalState();

  const supabase = tryCreateBrowserSupabaseClient();
  if (!supabase) {
    return { ok: false, message: "Auth is not configured." };
  }

  const { error } = await supabase.auth.signOut({ scope: "global" });
  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true };
}
