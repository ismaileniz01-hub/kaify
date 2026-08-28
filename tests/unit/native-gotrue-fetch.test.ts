import { afterEach, describe, expect, it, vi } from "vitest";
import { nativeGoTrueFetch } from "../../native-app/src/native-gotrue-fetch";

function fakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "none" })).toString(
    "base64url",
  );
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.sig`;
}

describe("native GoTrue fetch interceptor", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("answers /auth/v1/user locally so iOS WKWebView never hits supabase.co", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const token = fakeJwt({
      sub: "user-1",
      email: "a@example.com",
      role: "authenticated",
    });
    const response = await nativeGoTrueFetch(
      "https://example.supabase.co/auth/v1/user",
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    const body = (await response.json()) as { id: string; email: string };
    expect(body).toMatchObject({ id: "user-1", email: "a@example.com" });
  });

  it("proxies refresh tokens through the Kaify API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          session: {
            accessToken: "new-access",
            refreshToken: "new-refresh",
            expiresIn: 3600,
          },
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const response = await nativeGoTrueFetch(
      "https://example.supabase.co/auth/v1/token?grant_type=refresh_token",
      {
        method: "POST",
        body: JSON.stringify({ refresh_token: "old-refresh" }),
      },
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://kaifyai.org/api/auth/session/refresh",
      expect.objectContaining({ method: "POST" }),
    );
    const body = (await response.json()) as {
      access_token: string;
      refresh_token: string;
    };
    expect(body).toMatchObject({
      access_token: "new-access",
      refresh_token: "new-refresh",
    });
  });

  it("does not throw WKWebView Load failed when leftover GoTrue calls fail", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Load failed")));
    const response = await nativeGoTrueFetch(
      "https://example.supabase.co/rest/v1/profiles",
      { method: "GET" },
    );
    expect(response.status).toBe(503);
  });
});
