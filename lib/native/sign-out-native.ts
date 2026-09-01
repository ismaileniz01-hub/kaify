const SIGNED_OUT_QUERY = "signed_out=1";

export function nativeShellLoginUrl(): string {
  if (typeof window === "undefined") return "/login";
  const platform = document.documentElement.dataset.platform;
  if (platform === "android") {
    return `https://localhost/?${SIGNED_OUT_QUERY}`;
  }
  if (platform === "ios") {
    return `capacitor://localhost/?${SIGNED_OUT_QUERY}`;
  }
  return `/login?${SIGNED_OUT_QUERY}`;
}

export function urlHasSignedOutFlag(search = ""): boolean {
  try {
    return new URLSearchParams(search.replace(/^\?/, "")).get("signed_out") === "1";
  } catch {
    return false;
  }
}

function supabaseAuthStorageKey(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return null;
  try {
    const ref = new URL(raw).hostname.split(".")[0] || "kaify";
    return `sb-${ref}-auth-token`;
  } catch {
    return "sb-kaify-auth-token";
  }
}

async function clearNativeSecureSession(): Promise<void> {
  if (typeof window === "undefined") return;
  const keys = new Set<string>();
  const known = supabaseAuthStorageKey();
  if (known) keys.add(known);
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith("sb-") && key.includes("auth-token")) {
        keys.add(key);
      }
    }
  } catch {
    // Private mode.
  }
  for (const key of keys) {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
  try {
    const { SecureStorage } = await import(
      "@aparajita/capacitor-secure-storage"
    );
    await Promise.race([
      Promise.all(
        [...keys].map((key) => SecureStorage.removeItem(key).catch(() => undefined)),
      ),
      new Promise((resolve) => window.setTimeout(resolve, 1200)),
    ]);
  } catch {
    // Plugin missing in browser.
  }
}

/** After website logout, drop the native keystore session and reopen the local login shell. */
export async function returnToNativeLoginShell(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;
  } catch {
    return;
  }
  await clearNativeSecureSession();
  window.location.replace(nativeShellLoginUrl());
}
