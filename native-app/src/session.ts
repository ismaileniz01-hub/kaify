import { createClient } from "@supabase/supabase-js";
import { SecureStorage } from "@aparajita/capacitor-secure-storage";

if (!__SUPABASE_URL__ || !__SUPABASE_ANON_KEY__) {
  throw new Error("Native Supabase public configuration is missing.");
}

const STORAGE_TIMEOUT_MS = 2_500;

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(fallback), ms);
    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        window.clearTimeout(timer);
        resolve(fallback);
      });
  });
}

/**
 * SecureStorage can hang on first Android plugin bridge call.
 * Never block app boot — time out and treat as empty session.
 */
const secureSessionStorage = {
  getItem: (key: string) =>
    withTimeout(
      SecureStorage.getItem(key).then((value) => value ?? null),
      STORAGE_TIMEOUT_MS,
      null,
    ),
  setItem: async (key: string, value: string) => {
    try {
      await withTimeout(SecureStorage.setItem(key, value), STORAGE_TIMEOUT_MS, undefined);
    } catch {
      // Persistence best-effort; auth can continue in-memory for this session.
    }
  },
  removeItem: async (key: string) => {
    try {
      await withTimeout(SecureStorage.removeItem(key), STORAGE_TIMEOUT_MS, undefined);
    } catch {
      // ignore
    }
  },
};

export const supabase = createClient(
  __SUPABASE_URL__,
  __SUPABASE_ANON_KEY__,
  {
    auth: {
      storage: secureSessionStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);
