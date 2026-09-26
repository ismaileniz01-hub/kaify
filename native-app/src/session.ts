import { createClient } from "@supabase/supabase-js";
import {
  NATIVE_PLUGIN_TIMEOUT_MS,
  readWebStorage,
  removeWebStorage,
  withTimeout,
  writeWebStorage,
} from "./boot-storage";
import { nativeGoTrueFetch } from "./native-gotrue-fetch";

if (!__SUPABASE_URL__ || !__SUPABASE_ANON_KEY__) {
  throw new Error("Native Supabase public configuration is missing.");
}

function authStorageKey(): string {
  try {
    const ref = new URL(__SUPABASE_URL__).hostname.split(".")[0] || "kaify";
    return `sb-${ref}-auth-token`;
  } catch {
    return "sb-kaify-auth-token";
  }
}

/**
 * kaifyai.org owns the live session after handoff and rotates its refresh
 * token. A persisted shell copy would go stale, and refreshing it would reuse
 * a rotated token and make Supabase revoke the WebView session. The shell
 * therefore keeps tokens in memory only, between OTP verify and handoff.
 */
export const supabase = createClient(__SUPABASE_URL__, __SUPABASE_ANON_KEY__, {
  global: {
    fetch: nativeGoTrueFetch,
  },
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

/** Removes tokens persisted by older builds (localStorage + Keychain/Keystore). */
export async function clearNativeAuthStorage(): Promise<void> {
  const key = authStorageKey();
  removeWebStorage(key);
  try {
    const { SecureStorage } = await import(
      "@aparajita/capacitor-secure-storage"
    );
    await withTimeout(
      SecureStorage.removeItem(key),
      NATIVE_PLUGIN_TIMEOUT_MS,
      undefined,
    );
  } catch {
    // Keystore clear is best-effort.
  }
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Stay on login even if GoTrue logout is mocked locally.
  }
}

const NATIVE_LOGIN_AT_KEY = "kaify_native_login_at";

/** Time of the last OTP/password sign-in in this shell (not token refreshes). */
export function recordNativeLogin(now = Date.now()): void {
  writeWebStorage(NATIVE_LOGIN_AT_KEY, String(now));
}

export function clearNativeLogin(): void {
  removeWebStorage(NATIVE_LOGIN_AT_KEY);
}

export function readNativeLoginAt(): number | null {
  const value = Number(readWebStorage(NATIVE_LOGIN_AT_KEY));
  return Number.isFinite(value) && value > 0 ? value : null;
}
