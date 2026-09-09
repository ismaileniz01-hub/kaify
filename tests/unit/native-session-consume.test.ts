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

import { NextRequest } from "next/server";
import { issueNativeHandoffTicket } from "@/lib/auth/native-handoff-ticket";
import { GET } from "@/app/api/auth/session/native-consume/route";

describe("native session consume (document GET)", () => {
  beforeEach(() => {
    setSession.mockReset();
    withCookies.mockClear();
    withCookies.mockImplementation((response: unknown) => response);
  });

  it("sets cookies on a 303 to welcome with a short-lived bearer cookie", async () => {
    setSession.mockResolvedValue({ error: null });
    const ticket = await issueNativeHandoffTicket({
      accessToken: "a".repeat(24),
      refreshToken: "r".repeat(16),
    });
    const request = new NextRequest(
      `https://kaifyai.org/api/auth/session/native-consume?ticket=${encodeURIComponent(ticket)}`,
    );
    const response = await GET(request);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://kaifyai.org/welcome?native_handoff=1",
    );
    expect(setSession).toHaveBeenCalledWith({
      access_token: "a".repeat(24),
      refresh_token: "r".repeat(16),
    });
    const bearer = response.cookies.get("kaify_native_bearer");
    expect(bearer?.value).toBeTruthy();
  });

  it("returns iOS users to the Capacitor login shell when the ticket is missing", async () => {
    const request = new NextRequest(
      "https://kaifyai.org/api/auth/session/native-consume",
      {
        headers: {
          "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
        },
      },
    );
    const response = await GET(request);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "capacitor://localhost/?signed_out=1",
    );
    expect(setSession).not.toHaveBeenCalled();
  });
});
