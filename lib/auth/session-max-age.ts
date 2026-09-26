/** Users re-authenticate (OTP / password) at least this often, on web and in the apps. */
export const SESSION_MAX_AGE_DAYS = 35;
export const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const segment = token.split(".")[1];
  if (!segment) return null;
  try {
    const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
    const pad =
      normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
    const parsed = JSON.parse(atob(normalized + pad)) as unknown;
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * When the session was first authenticated, from Supabase `amr` timestamps.
 * Refreshes copy `amr` unchanged, so this does not slide with token rotation.
 */
export function sessionAuthenticatedAtMs(accessToken: string): number | null {
  const amr = decodeJwtPayload(accessToken)?.amr;
  if (!Array.isArray(amr)) return null;
  let earliest: number | null = null;
  for (const entry of amr) {
    const timestamp = (entry as { timestamp?: unknown } | null)?.timestamp;
    if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) continue;
    if (earliest === null || timestamp < earliest) earliest = timestamp;
  }
  return earliest === null ? null : earliest * 1000;
}

export function isSessionPastMaxAge(accessToken: string, now = Date.now()): boolean {
  const authenticatedAt = sessionAuthenticatedAtMs(accessToken);
  return authenticatedAt !== null && now - authenticatedAt > SESSION_MAX_AGE_MS;
}

export function isLoginWithinMaxAge(loginAtMs: number | null, now = Date.now()): boolean {
  return loginAtMs !== null && loginAtMs <= now && now - loginAtMs <= SESSION_MAX_AGE_MS;
}
