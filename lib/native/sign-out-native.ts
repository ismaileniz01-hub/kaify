import {
  ANDROID_SHELL_ORIGIN,
  IOS_SHELL_ORIGIN,
} from "@/lib/native/native-entry-boot";

const SIGNED_OUT_QUERY = "signed_out=1";

/** Social/mail apps embed WKWebView without "Safari/" in the UA, like our shell does. */
const IN_APP_BROWSER_UA =
  /fban|fbav|instagram|line\/|gsa\/|twitter|linkedinapp|snapchat|musical_ly|bytedance|pinterest|micromessenger/;

function hasCapacitorIosBridge(): boolean {
  try {
    const handlers = (
      window as unknown as {
        webkit?: { messageHandlers?: Record<string, unknown> };
      }
    ).webkit?.messageHandlers;
    return Boolean(handlers && "bridge" in handlers && handlers.bridge);
  } catch {
    return false;
  }
}

export function looksLikeNativeWebView(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (document.documentElement.classList.contains("native-app")) return true;
    const platform = document.documentElement.dataset.platform;
    if (platform === "ios" || platform === "android") return true;
  } catch {
    // ignore
  }
  const ua = (navigator.userAgent || "").toLowerCase();
  if (ua.includes("kaifynative") || ua.includes("capacitor")) return true;
  if (IN_APP_BROWSER_UA.test(ua)) return false;
  if (ua.includes("; wv)") && ua.includes("android")) return true;
  const apple =
    ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod");
  if (!apple) return false;
  if (hasCapacitorIosBridge()) return true;
  return (
    ua.includes("applewebkit") &&
    ua.includes("mobile") &&
    !ua.includes("safari/")
  );
}

/** Shell origin for this WebView, or null in a normal browser. */
export function currentNativeShellOrigin(): string | null {
  if (typeof window === "undefined") return null;
  const platform = document.documentElement.dataset.platform;
  if (platform === "android") return ANDROID_SHELL_ORIGIN;
  if (platform === "ios") return IOS_SHELL_ORIGIN;
  if (!looksLikeNativeWebView()) return null;
  return /Android/i.test(navigator.userAgent || "")
    ? ANDROID_SHELL_ORIGIN
    : IOS_SHELL_ORIGIN;
}

export function nativeShellLoginUrl(): string {
  const origin = currentNativeShellOrigin();
  return origin
    ? `${origin}/?${SIGNED_OUT_QUERY}`
    : `/login?${SIGNED_OUT_QUERY}`;
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

/**
 * After website logout or a failed native session, reopen the local login shell.
 * Resolves true when a shell navigation was started (callers must not navigate again).
 */
export async function returnToNativeLoginShell(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  let capacitorNative = false;
  try {
    const { Capacitor } = await import("@capacitor/core");
    capacitorNative = Capacitor.isNativePlatform();
  } catch {
    capacitorNative = false;
  }
  if (!capacitorNative && !looksLikeNativeWebView()) return false;
  await clearNativeSecureSession();
  window.location.replace(nativeShellLoginUrl());
  return true;
}
