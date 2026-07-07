import { CANONICAL_APP_URL, isAppHostname, NATIVE_URL_SCHEME, resolveAppUrl } from "@/lib/app-url";

/**
 * Normalize push / universal-link / custom-scheme URLs into an in-app path or absolute URL.
 */
export function resolveAppNavigationTarget(
  raw: string,
  origin = typeof window !== "undefined" ? window.location.origin : resolveAppUrl(),
): string {
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
