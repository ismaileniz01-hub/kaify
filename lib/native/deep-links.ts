import { CANONICAL_APP_URL, isAppHostname, NATIVE_URL_SCHEME } from "@/lib/app-url";

/**
 * Normalize push / universal-link / custom-scheme URLs into an in-app path or absolute URL.
 */
export function resolveAppNavigationTarget(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "/welcome";

  if (trimmed.startsWith(`${NATIVE_URL_SCHEME}://`)) {
    const path = trimmed.slice(`${NATIVE_URL_SCHEME}://`.length);
    return path.startsWith("/") ? path : `/${path}`;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      if (isAppHostname(url.hostname)) {
        return `${url.pathname}${url.search}${url.hash}`;
      }
      return trimmed;
    } catch {
      return "/welcome";
    }
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

/** Navigate inside the Capacitor WebView or browser. */
export function navigateAppUrl(raw: string): void {
  if (typeof window === "undefined") return;
  const target = resolveAppNavigationTarget(raw);
  if (target.startsWith("http://") || target.startsWith("https://")) {
    window.location.href = target;
    return;
  }
  window.location.href = `${window.location.origin}${target}`;
}

export function referralShareUrl(code: string): string {
  return `${CANONICAL_APP_URL}/welcome?ref=${encodeURIComponent(code)}`;
}

/** Local native screens — members sign in only; no plan/signup checkout UI. */
export type NativeScreen = "login" | "verify" | "welcome" | "chat";

const SCREEN_BY_PREFIX: Array<{ prefix: string; screen: NativeScreen }> = [
  { prefix: "/login", screen: "login" },
  { prefix: "/welcome", screen: "welcome" },
  { prefix: "/chat", screen: "chat" },
];

/** Map a deep-link URL to a local screen. Query strings are discarded. */
export function nativeScreenFromUrl(raw: string): NativeScreen {
  const target = resolveAppNavigationTarget(raw);
  const pathname = target.split("?")[0]?.split("#")[0] ?? "/login";
  // Signup / pricing / myaccount are website-only; stay on login in the shell.
  if (
    pathname === "/signup" ||
    pathname.startsWith("/signup/") ||
    pathname === "/pricing" ||
    pathname.startsWith("/pricing/") ||
    pathname === "/myaccount" ||
    pathname.startsWith("/myaccount/")
  ) {
    return "login";
  }
  const match = SCREEN_BY_PREFIX.find(
    (entry) =>
      pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`),
  );
  return match?.screen ?? "login";
}
