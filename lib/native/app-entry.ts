import { resolveAppUrl } from "../app-url";

/** First screen inside the native shell (not the marketing landing). */
export const NATIVE_ENTRY_PATH = "/login";

/**
 * Marketing landing is web-only. Signup and plan comparison are packaged in
 * the native client; only Paddle checkout/portal may leave the app.
 */
export const WEB_ONLY_PATHS = ["/"] as const;

export function isWebOnlyPath(pathname: string): boolean {
  return WEB_ONLY_PATHS.some((path) =>
    path === "/" ? pathname === path : pathname === path || pathname.startsWith(`${path}/`),
  );
}

/** Native fallback when a website-only route is opened in the store app. */
export function nativeFallbackForWebOnlyPath(pathname: string): string {
  void pathname;
  return NATIVE_ENTRY_PATH;
}

/**
 * Development-only remote URL. Store builds do not call this helper and load
 * `native-dist` from the application package.
 */
export function resolveNativeServerUrl(): string {
  const raw = (process.env.CAPACITOR_SERVER_URL ?? resolveAppUrl()).replace(
    /\/$/,
    "",
  );
  if (raw.startsWith("http://")) return raw;
  if (raw.endsWith(NATIVE_ENTRY_PATH)) return raw;
  return `${raw}${NATIVE_ENTRY_PATH}`;
}
