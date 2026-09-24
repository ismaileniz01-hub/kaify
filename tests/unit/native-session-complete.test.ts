import { beforeEach, describe, expect, it, vi } from "vitest";

const setSession = vi.fn();
const withCookies = vi.fn((response: unknown) => response);

vi.mock("@/lib/supabase/route-handler", () => ({
  createRouteHandlerSupabase: () => ({
    supabase: { auth: { setSession } },
    withCookies,
  }),
}));

vi.mock("@/lib/api/rate-guard", () => ({
  enforcePublicRateLimit: vi.fn(),
}));

vi.mock("@/lib/api-security", () => ({
  getClientIP: () => "127.0.0.1",
}));

import { POST } from "@/app/api/auth/session/native-complete/route";

describe("native session complete (document POST)", () => {
  beforeEach(() => {
    setSession.mockReset();
    withCookies.mockClear();
    withCookies.mockImplementation((response: unknown) => response);
  });

  it("returns HTML that embeds tokens after a form POST", async () => {
    setSession.mockResolvedValue({ error: null });
    const body = new URLSearchParams({
      accessToken: "a".repeat(24),
      refreshToken: "r".repeat(16),
    });
    const request = new Request("https://kaifyai.org/api/auth/session/native-complete", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });

    const response = await POST(request as never);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    const html = await response.text();
    expect(html).toContain("a".repeat(24));
    expect(html).toContain("/welcome?native_handoff=1");
    expect(setSession).toHaveBeenCalledWith({
      access_token: "a".repeat(24),
      refresh_token: "r".repeat(16),
    });
    expect(withCookies).toHaveBeenCalled();
  });

  it("returns to login when tokens are missing", async () => {
    const request = new Request("https://kaifyai.org/api/auth/session/native-complete", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ accessToken: "", refreshToken: "" }),
    });
    const response = await POST(request as never);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/login?native_session=0");
    expect(setSession).not.toHaveBeenCalled();
  });

  it("returns iOS users to the Capacitor login shell when tokens are missing", async () => {
    const request = new Request("https://kaifyai.org/api/auth/session/native-complete", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
      },
      body: new URLSearchParams({ accessToken: "", refreshToken: "" }),
    });
    const response = await POST(request as never);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://localhost/?signed_out=1",
    );
  });
});
