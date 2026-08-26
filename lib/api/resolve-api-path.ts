import { API_LEGACY_EXCLUDED_PREFIXES } from "@/lib/api/v1-manifest";

function withApiBase(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "");
  return base ? `${base}${path}` : path;
}

/**
 * Prefer stable `/api/v1/*` for client calls (Faz 4 / TD-004).
 * Legacy aliases and non-v1 surfaces (admin, waitlist, gifts, …) stay as-is.
 */
export function resolveApiPath(path: string): string {
  if (!path.startsWith("/api/")) return path;
  if (path.startsWith("/api/v1/")) return withApiBase(path);
  for (const prefix of API_LEGACY_EXCLUDED_PREFIXES) {
    if (path === prefix || path.startsWith(prefix)) return withApiBase(path);
  }

  const [pathname, query = ""] = path.split("?");
  const q = query ? `?${query}` : "";

  // Legacy aliases → canonical v1
  if (pathname === "/api/country-leaderboard") {
    return withApiBase(`/api/v1/leaderboard/country${q}`);
  }
  if (pathname === "/api/leaderboard") {
    return withApiBase(`/api/v1/leaderboard/global${q}`);
  }
  if (pathname === "/api/analytics/confirm") {
    return withApiBase(`/api/v1/analytics/confirm${q}`);
  }

  // Surfaces without a v1 twin yet
  if (
    pathname.startsWith("/api/gifts/") ||
    pathname.startsWith("/api/billing/") ||
    pathname.startsWith("/api/paddle/")
  ) {
    return withApiBase(path);
  }

  return withApiBase(`/api/v1/${pathname.slice("/api/".length)}${q}`);
}
