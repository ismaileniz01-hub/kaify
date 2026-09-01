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

const memory = new Map<string, string>();

function authStorageKey(): string {
  try {
    const ref = new URL(__SUPABASE_URL__).hostname.split(".")[0] || "kaify";
    return `sb-${ref}-auth-token`;
  } catch {
    return "sb-kaify-auth-token";
  }
}

function queueSecureWrite(key: string, value: string | null): void {
  window.setTimeout(() => {
    void (async () => {
      try {
        const { SecureStorage } = await import(
          "@aparajita/capacitor-secure-storage"
        );
        if (value === null) {
          await withTimeout(
            SecureStorage.removeItem(key),
            NATIVE_PLUGIN_TIMEOUT_MS,
            undefined,
          );
          return;
        }
        await withTimeout(
          SecureStorage.setItem(key, value),
          NATIVE_PLUGIN_TIMEOUT_MS,
          undefined,
        );
      } catch {
        // Keychain/Keystore is best-effort. Boot must never wait on it.
      }
    })();
  }, 400);
}

/**
 * Session reads are localStorage/memory only. Calling SecureStorage during
 * module init deadlocks the Android Capacitor bridge (infinite splash).
 */
const bootSafeStorage = {
  getItem: async (key: string) =>
    memory.get(key) ?? readWebStorage(key) ?? null,
  setItem: async (key: string, value: string) => {
    memory.set(key, value);
    writeWebStorage(key, value);
    queueSecureWrite(key, value);
  },
  removeItem: async (key: string) => {
    memory.delete(key);
    removeWebStorage(key);
    queueSecureWrite(key, null);
  },
};

function tokensFromStoredSession(
  raw: string,
): { access_token: string; refresh_token: string } | null {
  try {
    const parsed = JSON.parse(raw) as {
      access_token?: unknown;
      refresh_token?: unknown;
      currentSession?: {
        access_token?: unknown;
        refresh_token?: unknown;
      };
    };
    const access =
      typeof parsed.access_token === "string"
        ? parsed.access_token
        : typeof parsed.currentSession?.access_token === "string"
          ? parsed.currentSession.access_token
          : "";
    const refresh =
      typeof parsed.refresh_token === "string"
        ? parsed.refresh_token
        : typeof parsed.currentSession?.refresh_token === "string"
          ? parsed.currentSession.refresh_token
          : "";
    if (!access || !refresh) return null;
    return { access_token: access, refresh_token: refresh };
  } catch {
    return null;
  }
}

export const supabase = createClient(__SUPABASE_URL__, __SUPABASE_ANON_KEY__, {
  global: {
    fetch: nativeGoTrueFetch,
  },
  auth: {
    storage: bootSafeStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export async function clearNativeAuthStorage(): Promise<void> {
  const key = authStorageKey();
  memory.delete(key);
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

export async function hydrateSecureSession(): Promise<void> {
  const key = authStorageKey();
  let raw = memory.get(key) ?? readWebStorage(key);
  if (!raw) {
    try {
      const { SecureStorage } = await import(
        "@aparajita/capacitor-secure-storage"
      );
      const value = await withTimeout(
        SecureStorage.getItem(key).then((item) => item ?? null),
        NATIVE_PLUGIN_TIMEOUT_MS,
        null,
      );
      if (typeof value === "string" && value.length > 0) {
        raw = value;
        memory.set(key, value);
        writeWebStorage(key, value);
      }
    } catch {
      return;
    }
  }
  if (!raw) return;
  const tokens = tokensFromStoredSession(raw);
  if (!tokens) return;
  try {
    await supabase.auth.setSession(tokens);
  } catch {
    // Stay signed out rather than blocking the login screen.
  }
}
