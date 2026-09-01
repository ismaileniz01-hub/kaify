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

const signInWithPassword = vi.fn();
const withCookies = vi.fn((res: Response) => res);

vi.mock("@/lib/supabase/route-handler", () => ({
  createRouteHandlerSupabase: () => ({
    supabase: { auth: { signInWithPassword } },
    withCookies,
  }),
}));

import { POST as passwordPost } from "@/app/api/auth/password/route";
import { passwordLoginSchema } from "@/lib/validations/auth-otp.schema";

function jsonRequest(
  body: unknown,
  extraHeaders: Record<string, string> = {},
): NextRequest {
  return {
    method: "POST",
    headers: new Headers({
      "content-type": "application/json",
      ...extraHeaders,
    }),
    json: async () => body,
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  signInWithPassword.mockReset();
  withCookies.mockImplementation((res: Response) => res);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("passwordLoginSchema", () => {
  it("accepts an email and password of at least 8 characters", () => {
    expect(
      passwordLoginSchema.safeParse({
        email: "play-review@kaifyai.org",
        password: "KaifyPlay1",
      }).success,
    ).toBe(true);
  });

  it("rejects short passwords", () => {
    expect(
      passwordLoginSchema.safeParse({
        email: "play-review@kaifyai.org",
        password: "short",
      }).success,
    ).toBe(false);
  });
});

describe("POST /api/auth/password", () => {
  it("returns validation error for a short password", async () => {
    const res = await passwordPost(
      jsonRequest({ email: "ok@example.com", password: "short" }),
    );
    expect(res.status).toBe(400);
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("returns verified:true when sign-in succeeds", async () => {
    signInWithPassword.mockResolvedValueOnce({
      data: {
        session: { access_token: "access", refresh_token: "refresh" },
      },
      error: null,
    });
    const res = await passwordPost(
      jsonRequest({ email: "ok@example.com", password: "KaifyPlay1" }),
    );
    expect(res.status).toBe(200);
    expect(withCookies).toHaveBeenCalled();
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "ok@example.com",
      password: "KaifyPlay1",
    });
    const body = (await res.json()) as {
      success: true;
      data: { verified: true; session?: { accessToken: string } };
    };
    expect(body.data.verified).toBe(true);
    expect(body.data.session).toBeUndefined();
  });

  it("returns native session tokens for Capacitor clients", async () => {
    signInWithPassword.mockResolvedValueOnce({
      data: {
        session: { access_token: "access", refresh_token: "refresh" },
      },
      error: null,
    });
    const res = await passwordPost(
      jsonRequest(
        { email: "ok@example.com", password: "KaifyPlay1" },
        { "x-client-version": "native-1.0.5" },
      ),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: true;
      data: {
        verified: true;
        session: { accessToken: string; refreshToken: string };
      };
    };
    expect(body.data.session).toEqual({
      accessToken: "access",
      refreshToken: "refresh",
    });
  });

  it("returns UNAUTHORIZED for invalid credentials", async () => {
    signInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" },
    });
    const res = await passwordPost(
      jsonRequest({ email: "ok@example.com", password: "WrongPass1" }),
    );
    expect(res.status).toBe(401);
    expect(withCookies).toHaveBeenCalled();
  });
});
