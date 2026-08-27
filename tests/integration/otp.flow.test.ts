import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const enforceOtpResendCooldown = vi.fn().mockResolvedValue(undefined);
const enforceOtpTargetRateLimit = vi.fn().mockResolvedValue(undefined);
const enforceOtpTargetHourlyRateLimit = vi.fn().mockResolvedValue(undefined);
const enforceOtpVerifyTargetRateLimit = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/api/rate-guard", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/rate-guard")>(
    "@/lib/api/rate-guard",
  );
  return {
    ...actual,
    enforcePublicRateLimit: vi.fn().mockResolvedValue(undefined),
    enforceUserRateLimit: vi.fn().mockResolvedValue(undefined),
    enforceOtpResendCooldown: (...args: unknown[]) =>
      enforceOtpResendCooldown(...args),
    enforceOtpTargetRateLimit: (...args: unknown[]) =>
      enforceOtpTargetRateLimit(...args),
    enforceOtpTargetHourlyRateLimit: (...args: unknown[]) =>
      enforceOtpTargetHourlyRateLimit(...args),
    enforceOtpVerifyTargetRateLimit: (...args: unknown[]) =>
      enforceOtpVerifyTargetRateLimit(...args),
  };
});

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

const validateRecaptcha = vi.fn().mockResolvedValue(true);
vi.mock("@/lib/api-security", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-security")>(
    "@/lib/api-security",
  );
  return {
    ...actual,
    validateRecaptcha: (...args: unknown[]) => validateRecaptcha(...args),
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
import { ApiError } from "@/lib/api/errors";
import { mapGoTrueOtpSendError, mapOtpSendError } from "@/lib/auth/map-otp-send-error";
import { otpSendSchema, otpVerifySchema } from "@/lib/validations/auth-otp.schema";

function jsonRequest(
  body: unknown,
  headers?: Record<string, string>,
): NextRequest {
  return {
    method: "POST",
    headers: new Headers({
      "content-type": "application/json",
      ...headers,
    }),
    json: async () => body,
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("RECAPTCHA_SECRET_KEY", "");
  sendAuthEmailOtp.mockReset();
  verifyOtp.mockReset();
  validateRecaptcha.mockReset();
  validateRecaptcha.mockResolvedValue(true);
  enforceOtpResendCooldown.mockReset();
  enforceOtpResendCooldown.mockResolvedValue(undefined);
  enforceOtpTargetRateLimit.mockReset();
  enforceOtpTargetRateLimit.mockResolvedValue(undefined);
  enforceOtpTargetHourlyRateLimit.mockReset();
  enforceOtpTargetHourlyRateLimit.mockResolvedValue(undefined);
  enforceOtpVerifyTargetRateLimit.mockReset();
  enforceOtpVerifyTargetRateLimit.mockResolvedValue(undefined);
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

  it("returns validation 400 for empty/null body (not middleware 403)", async () => {
    const res = await otpSendPost(jsonRequest(null));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { success: false };
    expect(body.success).toBe(false);
  });

  it("keeps web reCAPTCHA validation", async () => {
    sendAuthEmailOtp.mockResolvedValue({ ok: true });
    const res = await otpSendPost(
      jsonRequest(
        { email: "ok@example.com", recaptchaToken: "web-tok" },
        { origin: "https://kaifyai.org" },
      ),
    );
    expect(res.status).toBe(200);
    expect(validateRecaptcha).toHaveBeenCalledWith("web-tok");
  });

  it("skips captcha for exact native origins and returns resendAfterSeconds", async () => {
    sendAuthEmailOtp.mockResolvedValue({ ok: true });
    const res = await otpSendPost(
      jsonRequest(
        { email: "native@example.com", locale: "en" },
        {
          origin: "capacitor://localhost",
          "x-client-version": "native-1.0.2",
        },
      ),
    );
    expect(res.status).toBe(200);
    expect(validateRecaptcha).not.toHaveBeenCalled();
    expect(sendAuthEmailOtp).toHaveBeenCalled();
    const body = (await res.json()) as {
      success: true;
      data: { sent: true; resendAfterSeconds: number };
    };
    expect(body.data).toEqual({ sent: true, resendAfterSeconds: 60 });
  });

  it("skips captcha for https://localhost native origin", async () => {
    sendAuthEmailOtp.mockResolvedValue({ ok: true });
    const res = await otpSendPost(
      jsonRequest(
        { email: "native2@example.com" },
        { origin: "https://localhost" },
      ),
    );
    expect(res.status).toBe(200);
    expect(validateRecaptcha).not.toHaveBeenCalled();
  });

  it("returns 429 OTP_RESEND_COOLDOWN with Retry-After on early resend", async () => {
    enforceOtpResendCooldown.mockRejectedValueOnce(
      new ApiError("OTP_RESEND_COOLDOWN", "Yeni kod istemeden önce lütfen biraz bekle.", {
        retryAfterMs: 45_000,
        retryAfterSeconds: 45,
      }),
    );
    const res = await otpSendPost(
      jsonRequest(
        { email: "cool@example.com" },
        { origin: "capacitor://localhost" },
      ),
    );
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("45");
    const body = (await res.json()) as {
      success: false;
      error: { code: string };
    };
    expect(body.error.code).toBe("OTP_RESEND_COOLDOWN");
    expect(sendAuthEmailOtp).not.toHaveBeenCalled();
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

  it("returns validation 400 for empty/null body (not middleware 403)", async () => {
    const res = await otpVerifyPost(jsonRequest(null));
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

  it("returns native session tokens for exact Capacitor origins", async () => {
    verifyOtp.mockResolvedValueOnce({
      data: {
        session: {
          access_token: "access-token",
          refresh_token: "refresh-token",
        },
      },
      error: null,
    });
    const res = await otpVerifyPost(
      jsonRequest(
        { email: "ok@example.com", token: "123456" },
        { origin: "https://localhost" },
      ),
    );
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
