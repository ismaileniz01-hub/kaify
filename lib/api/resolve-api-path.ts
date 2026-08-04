import { API_LEGACY_EXCLUDED_PREFIXES } from "@/lib/api/v1-manifest";

/**
 * Prefer stable `/api/v1/*` for client calls (Faz 4 / TD-004).
 * Legacy aliases and non-v1 surfaces (admin, waitlist, gifts, …) stay as-is.
 */
export function resolveApiPath(path: string): string {
  if (!path.startsWith("/api/")) return path;
  if (path.startsWith("/api/v1/")) return path;
  for (const prefix of API_LEGACY_EXCLUDED_PREFIXES) {
    if (path === prefix || path.startsWith(prefix)) return path;
  }

  const [pathname, query = ""] = path.split("?");
  const q = query ? `?${query}` : "";

  // Legacy aliases → canonical v1
  if (pathname === "/api/country-leaderboard") {
    return `/api/v1/leaderboard/country${q}`;
  }
  if (pathname === "/api/leaderboard") {
    return `/api/v1/leaderboard/global${q}`;
  }
  if (pathname === "/api/analytics/confirm") {
    return `/api/v1/analytics/confirm${q}`;
  }

  // Surfaces without a v1 twin yet
  if (
    pathname.startsWith("/api/gifts/") ||
    pathname.startsWith("/api/billing/") ||
    pathname.startsWith("/api/paddle/")
  ) {
    return path;
  }

  return `/api/v1/${pathname.slice("/api/".length)}${q}`;
}
