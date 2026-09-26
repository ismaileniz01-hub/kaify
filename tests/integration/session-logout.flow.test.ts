import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/api/rate-guard", () => ({
  enforcePublicRateLimit: vi.fn().mockResolvedValue(undefined),
  enforceUserRateLimit: vi.fn().mockResolvedValue(undefined),
  enforceOtpTargetRateLimit: vi.fn().mockResolvedValue(undefined),
  AI_RATE_LIMITS: {},
  OTP_TARGET_RATE_LIMIT: { requests: 5, windowMs: 15 * 60 * 1000 },
}));

vi.mock("@/lib/observability/tracing", () => ({
  withSpan: async (_name: string, fn: () => Promise<unknown>) => fn(),
}));

vi.mock("@/lib/api/request-context", () => ({
  getRequestId: async () => "test-req",
}));

const signOut = vi.fn();
const withCookies = vi.fn((res: Response) => res);

vi.mock("@/lib/supabase/route-handler", () => ({
  createRouteHandlerSupabase: () => ({
    supabase: { auth: { signOut } },
    withCookies,
  }),
}));

import { POST as logoutPost } from "@/app/api/auth/session/logout/route";

function jsonRequest(): NextRequest {
  return {
    method: "POST",
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => ({}),
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  signOut.mockReset();
  withCookies.mockImplementation((res: Response) => res);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/auth/session/logout", () => {
  it("expires the cookie session", async () => {
    signOut.mockResolvedValueOnce({ error: null });
    const res = await logoutPost(jsonRequest());
    expect(res.status).toBe(200);
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(withCookies).toHaveBeenCalled();
    const body = (await res.json()) as {
      success: true;
      data: { signedOut: true };
    };
    expect(body.data.signedOut).toBe(true);
  });
});
