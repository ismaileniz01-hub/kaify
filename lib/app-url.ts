/**
 * Canonical production URL for Kaify (web + Capacitor remote shell).
 * Override with NEXT_PUBLIC_APP_URL / CAPACITOR_SERVER_URL per environment.
 */
export const CANONICAL_APP_URL = "https://kaifyai.org";

/** Custom URL scheme for native deep links (`kaify://chat/kai`). */
export const NATIVE_URL_SCHEME = "kaify";

export const NATIVE_APP_ID = "org.kaify.app";

const TRAILING_SLASH = /\/$/;

/** Resolved app origin without trailing slash. */
export function resolveAppUrl(): string {
  const fromEnv =
    (typeof process !== "undefined" &&
      (process.env.NEXT_PUBLIC_APP_URL ?? process.env.CAPACITOR_SERVER_URL)) ||
    undefined;
  return (fromEnv ?? CANONICAL_APP_URL).replace(TRAILING_SLASH, "");
}

/** Hostnames treated as first-party Kaify origins (API CSRF, deep links). */
export const APP_HOSTNAMES = [
  "kaifyai.org",
  "www.kaifyai.org",
  "kaify.org",
  "www.kaify.org",
  "localhost",
  "127.0.0.1",
  "10.0.2.2",
] as const;

export function isAppHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return APP_HOSTNAMES.some((h) => host === h || host.endsWith(`.${h}`));
}
