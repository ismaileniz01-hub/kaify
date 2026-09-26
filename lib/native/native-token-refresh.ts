import {
  clearNativeEntryTokens,
  readNativeEntrySession,
  storeNativeEntryTokens,
} from "@/lib/native/native-entry-boot";
import { decodeJwtPayload, isSessionPastMaxAge } from "@/lib/auth/session-max-age";

export const NATIVE_REFRESH_PATH = "/api/auth/session/refresh";
/** Refresh this long before `exp` so a request never lands with a dead bearer. */
const EXPIRY_SKEW_MS = 60_000;
const REFRESH_TIMEOUT_MS = 8_000;

export type NativeRefreshResult =
  | { status: "ok"; accessToken: string }
  /** Refresh token revoked or expired — the session is gone. */
  | { status: "rejected" }
  /** Network, rate limit, or server error — keep tokens and retry later. */
  | { status: "unavailable" };

let inflight: Promise<NativeRefreshResult> | null = null;

export function accessTokenExpiresAtMs(token: string): number | null {
  const exp = decodeJwtPayload(token)?.exp;
  return typeof exp === "number" ? exp * 1000 : null;
}

export function isAccessTokenExpiring(token: string, now = Date.now()): boolean {
  const expiresAt = accessTokenExpiresAtMs(token);
  return expiresAt !== null && expiresAt - EXPIRY_SKEW_MS <= now;
}

async function requestRefresh(refreshToken: string): Promise<
  | { accessToken: string; refreshToken: string }
  | "rejected"
  | "unavailable"
> {
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);
  try {
    const response = await fetch(NATIVE_REFRESH_PATH, {
      method: "POST",
      credentials: "include",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Client-Version": "native-web",
      },
      body: JSON.stringify({ refreshToken }),
    });
    const payload = (await response.json().catch(() => null)) as {
      success?: boolean;
      data?: { session?: { accessToken?: string; refreshToken?: string } };
      error?: { code?: string };
    } | null;
    const session = payload?.data?.session;
    if (response.ok && session?.accessToken && session.refreshToken) {
      return { accessToken: session.accessToken, refreshToken: session.refreshToken };
    }
    const code = payload?.error?.code;
    if (code === "UNAUTHORIZED" || code === "VALIDATION_ERROR") return "rejected";
    return "unavailable";
  } catch {
    return "unavailable";
  } finally {
    globalThis.clearTimeout(timer);
  }
}

/**
 * Rotates the stored native tokens once, shared by concurrent callers.
 * Supabase refresh tokens are single-use, so parallel refreshes would revoke the session.
 */
export function refreshNativeEntryTokens(): Promise<NativeRefreshResult> {
  if (inflight) return inflight;
  inflight = (async (): Promise<NativeRefreshResult> => {
    const current = readNativeEntrySession();
    if (!current) return { status: "rejected" };
    const result = await requestRefresh(current.refreshToken);
    if (result === "unavailable") return { status: "unavailable" };
    if (result === "rejected") {
      const latest = readNativeEntrySession();
      if (latest && latest.refreshToken !== current.refreshToken) {
        return { status: "ok", accessToken: latest.accessToken };
      }
      clearNativeEntryTokens();
      return { status: "rejected" };
    }
    storeNativeEntryTokens(result);
    return { status: "ok", accessToken: result.accessToken };
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

/** Stored native bearer, refreshed first when it is expired or about to expire. */
export async function getFreshNativeAccessToken(): Promise<string | null> {
  const current = readNativeEntrySession();
  if (!current) return null;
  if (isSessionPastMaxAge(current.accessToken)) {
    clearNativeEntryTokens();
    return null;
  }
  if (!isAccessTokenExpiring(current.accessToken)) return current.accessToken;
  const refreshed = await refreshNativeEntryTokens();
  if (refreshed.status === "ok") return refreshed.accessToken;
  if (refreshed.status === "rejected") return null;
  return current.accessToken;
}
