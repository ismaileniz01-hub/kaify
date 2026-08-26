import { createClient } from "@supabase/supabase-js";
import { SecureStorage } from "@aparajita/capacitor-secure-storage";

if (!__SUPABASE_URL__ || !__SUPABASE_ANON_KEY__) {
  throw new Error("Native Supabase public configuration is missing.");
}

const secureSessionStorage = {
  getItem: (key: string) => SecureStorage.getItem(key),
  setItem: (key: string, value: string) => SecureStorage.setItem(key, value),
  removeItem: (key: string) => SecureStorage.removeItem(key),
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
