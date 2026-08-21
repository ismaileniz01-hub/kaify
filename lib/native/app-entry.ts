import { resolveAppUrl } from "../app-url";

/** First screen inside the native shell (not the marketing landing). */
export const NATIVE_ENTRY_PATH = "/login";

/**
 * Public website surfaces that must never render inside the consumption-only
 * native shell. Account creation and subscriptions happen on the website;
 * the installed app is for existing customers to sign in and use.
 */
export const WEB_ONLY_PATHS = ["/", "/signup", "/pricing"] as const;

export function isWebOnlyPath(pathname: string): boolean {
  return WEB_ONLY_PATHS.some((path) =>
    path === "/" ? pathname === path : pathname === path || pathname.startsWith(`${path}/`),
  );
}

/** Native fallback when a website-only route is opened in the store app. */
export function nativeFallbackForWebOnlyPath(pathname: string): string {
  if (pathname === "/pricing" || pathname.startsWith("/pricing/")) {
    return "/myaccount";
  }
  return NATIVE_ENTRY_PATH;
}

/**
 * URL baked into the Capacitor shell at `cap sync` time.
 * Local dev keeps the dev-server root; production opens the app hub.
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
