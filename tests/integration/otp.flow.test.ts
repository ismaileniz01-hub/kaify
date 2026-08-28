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

const sendAuthEmailOtp = vi.fn();
vi.mock("@/lib/auth/send-otp-server", () => ({
  sendAuthEmailOtp: (...args: unknown[]) => sendAuthEmailOtp(...args),
}));

vi.mock("@/lib/api-security", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-security")>(
    "@/lib/api-security",
  );
  return {
    ...actual,
    validateRecaptcha: vi.fn().mockResolvedValue(true),
    getClientIP: () => "127.0.0.1",
  };
});

const verifyOtp = vi.fn();
const withCookies = vi.fn((res: Response) => res);

vi.mock("@/lib/supabase/route-handler", () => ({
  createRouteHandlerSupabase: () => ({
    supabase: { auth: { verifyOtp } },
    withCookies,
  }),
}));

import { POST as otpSendPost } from "@/app/api/auth/otp/send/route";
import { POST as otpVerifyPost } from "@/app/api/auth/otp/verify/route";
import { mapGoTrueOtpSendError, mapOtpSendError } from "@/lib/auth/map-otp-send-error";
import { otpSendSchema, otpVerifySchema } from "@/lib/validations/auth-otp.schema";

function jsonRequest(body: unknown): NextRequest {
  return {
    method: "POST",
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => body,
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("RECAPTCHA_SECRET_KEY", "");
  sendAuthEmailOtp.mockReset();
  verifyOtp.mockReset();
  withCookies.mockImplementation((res: Response) => res);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("otp schemas", () => {
  it("accepts a normal send payload", () => {
    expect(otpSendSchema.safeParse({ email: "a@example.com" }).success).toBe(true);
  });

  it("rejects invalid email on send", () => {
    expect(otpSendSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
  });

  it("requires a 6-digit token on verify", () => {
    expect(
      otpVerifySchema.safeParse({ email: "a@example.com", token: "12345" }).success,
    ).toBe(false);
    expect(
      otpVerifySchema.safeParse({ email: "a@example.com", token: "123456" }).success,
    ).toBe(true);
  });
});

describe("mapOtpSendError", () => {
  it("maps rate limit messages", () => {
    const err = mapOtpSendError({
      message: "For security purposes, you can only request this once every 60 seconds",
      name: "AuthApiError",
      status: 429,
    } as never);
    expect(err.code).toBe("RATE_LIMITED");
  });

  it("maps invalid email", () => {
    const err = mapGoTrueOtpSendError({
      code: "email_address_invalid",
      message: "Invalid email",
      status: 400,
    });
    expect(err.code).toBe("VALIDATION_ERROR");
  });

  it("maps unexpected failure to SERVICE_UNAVAILABLE", () => {
    const err = mapGoTrueOtpSendError({
      code: "unexpected_failure",
      message: "Database error",
      status: 500,
    });
    expect(err.code).toBe("SERVICE_UNAVAILABLE");
  });
});

describe("POST /api/auth/otp/send", () => {
  it("returns validation error for bad email", async () => {
    const res = await otpSendPost(jsonRequest({ email: "bad" }));
    expect(res.status).toBe(400);
  });

  it("returns sent:true on success", async () => {
    sendAuthEmailOtp.mockResolvedValue({ ok: true });
    const res = await otpSendPost(
      jsonRequest({ email: "ok@example.com", recaptchaToken: "tok" }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: true; data: { sent: true } };
    expect(body.success).toBe(true);
    expect(body.data.sent).toBe(true);
  });

  it("maps GoTrue rate limit to RATE_LIMITED", async () => {
    sendAuthEmailOtp.mockResolvedValue({
      ok: false,
      error: { message: "rate limit exceeded", status: 429 },
    });
    const res = await otpSendPost(
      jsonRequest({ email: "ok@example.com", recaptchaToken: "tok" }),
    );
    expect(res.status).toBe(429);
  });
});

describe("POST /api/auth/otp/verify", () => {
  it("rejects non-6-digit tokens", async () => {
    const res = await otpVerifyPost(
      jsonRequest({ email: "ok@example.com", token: "abcdef" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns verified:true when email OTP succeeds", async () => {
    verifyOtp.mockResolvedValueOnce({ data: {}, error: null });
    const res = await otpVerifyPost(
      jsonRequest({ email: "ok@example.com", token: "123456" }),
    );
    expect(res.status).toBe(200);
    expect(withCookies).toHaveBeenCalled();
    const body = (await res.json()) as { success: true; data: { verified: true } };
    expect(body.data.verified).toBe(true);
  });

  it("returns native session tokens for Capacitor WebView origins", async () => {
    verifyOtp.mockResolvedValueOnce({
      data: {
        session: {
          access_token: "access-token",
          refresh_token: "refresh-token",
        },
      },
      error: null,
    });
    const res = await otpVerifyPost({
      method: "POST",
      headers: new Headers({
        "content-type": "application/json",
        origin: "https://localhost",
      }),
      json: async () => ({ email: "ok@example.com", token: "123456" }),
    } as unknown as NextRequest);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: true;
      data: {
        verified: true;
        session?: { accessToken: string; refreshToken: string };
      };
    };
    expect(body.data.session).toEqual({
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
  });

  it("returns native session tokens for X-Client-Version even without Origin", async () => {
    verifyOtp.mockResolvedValueOnce({
      data: {
        session: {
          access_token: "access-token",
          refresh_token: "refresh-token",
        },
      },
      error: null,
    });
    const res = await otpVerifyPost({
      method: "POST",
      headers: new Headers({
        "content-type": "application/json",
        "x-client-version": "native-1.0.5",
        "user-agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
      }),
      json: async () => ({ email: "ok@example.com", token: "123456" }),
    } as unknown as NextRequest);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: true;
      data: {
        verified: true;
        session?: { accessToken: string; refreshToken: string };
      };
    };
    expect(body.data.session).toEqual({
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
  });

  it("falls back to signup type then fails as UNAUTHORIZED", async () => {
    verifyOtp
      .mockResolvedValueOnce({ data: null, error: { message: "bad" } })
      .mockResolvedValueOnce({ data: null, error: { message: "still bad" } });

    const res = await otpVerifyPost(
      jsonRequest({ email: "ok@example.com", token: "123456" }),
    );
    expect(res.status).toBe(401);
    expect(verifyOtp).toHaveBeenCalledTimes(2);
  });
});
