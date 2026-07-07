import { resolveAppUrl } from "@/lib/app-url";

/** First screen inside the native shell (not the marketing landing). */
export const NATIVE_ENTRY_PATH = "/login";

/** Paths that belong to the public website, not the in-app experience. */
export const WEB_ONLY_PATHS = ["/"] as const;

export function isWebOnlyPath(pathname: string): boolean {
  return (WEB_ONLY_PATHS as readonly string[]).includes(pathname);
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
