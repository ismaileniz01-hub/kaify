import { afterEach, describe, expect, it, vi } from "vitest";
import {
  NATIVE_ENTRY_TOKEN_KEY,
  clearNativeEntryTokens,
  readNativeEntrySession,
} from "@/lib/native/native-entry-boot";
import {
  NATIVE_REFRESH_PATH,
  getFreshNativeAccessToken,
  isAccessTokenExpiring,
  refreshNativeEntryTokens,
} from "@/lib/native/native-token-refresh";

function jwt(expSeconds: number): string {
  const b64 = (value: object) =>
    btoa(JSON.stringify(value)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${b64({ alg: "HS256" })}.${b64({ exp: expSeconds, sub: "u1" })}.sig`;
}

function storeTokens(accessToken: string, refreshToken: string): void {
  sessionStorage.setItem(
    NATIVE_ENTRY_TOKEN_KEY,
    JSON.stringify({ accessToken, refreshToken }),
  );
}

function mockRefreshResponse(status: number, body: unknown) {
  const fetchMock = vi.fn<typeof fetch>(async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  clearNativeEntryTokens();
  vi.unstubAllGlobals();
});

describe("native token refresh", () => {
  it("treats tokens within a minute of exp as expiring", () => {
    const now = Date.now();
    expect(isAccessTokenExpiring(jwt(Math.floor(now / 1000) + 30), now)).toBe(true);
    expect(isAccessTokenExpiring(jwt(Math.floor(now / 1000) + 3600), now)).toBe(false);
    expect(isAccessTokenExpiring("not-a-jwt", now)).toBe(false);
  });

  it("returns a valid stored token without calling the network", async () => {
    const fresh = jwt(Math.floor(Date.now() / 1000) + 3600);
    storeTokens(fresh, "refresh-1");
    const fetchMock = mockRefreshResponse(200, {});
    await expect(getFreshNativeAccessToken()).resolves.toBe(fresh);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rotates an expired token once and stores the new pair", async () => {
    storeTokens(jwt(Math.floor(Date.now() / 1000) - 10), "refresh-old");
    const next = jwt(Math.floor(Date.now() / 1000) + 3600);
    const fetchMock = mockRefreshResponse(200, {
      success: true,
      data: { session: { accessToken: next, refreshToken: "refresh-new" } },
    });
    const [a, b] = await Promise.all([
      getFreshNativeAccessToken(),
      getFreshNativeAccessToken(),
    ]);
    expect(a).toBe(next);
    expect(b).toBe(next);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(NATIVE_REFRESH_PATH);
    expect(readNativeEntrySession()).toEqual({
      accessToken: next,
      refreshToken: "refresh-new",
    });
  });

  it("clears tokens when the refresh token is rejected", async () => {
    storeTokens(jwt(Math.floor(Date.now() / 1000) - 10), "refresh-dead");
    mockRefreshResponse(401, {
      success: false,
      error: { code: "UNAUTHORIZED", message: "expired" },
    });
    await expect(refreshNativeEntryTokens()).resolves.toEqual({ status: "rejected" });
    expect(readNativeEntrySession()).toBeNull();
  });

  it("keeps tokens on transient refresh failures", async () => {
    const stale = jwt(Math.floor(Date.now() / 1000) - 10);
    storeTokens(stale, "refresh-keep");
    mockRefreshResponse(429, {
      success: false,
      error: { code: "RATE_LIMITED", message: "slow down" },
    });
    await expect(refreshNativeEntryTokens()).resolves.toEqual({ status: "unavailable" });
    expect(readNativeEntrySession()?.refreshToken).toBe("refresh-keep");
  });
});
