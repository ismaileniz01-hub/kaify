import { afterEach, describe, expect, it, vi } from "vitest";

const setSession = vi.fn();

vi.mock("../../native-app/src/session", () => ({
  supabase: {
    auth: {
      setSession: (...args: unknown[]) => setSession(...args),
    },
  },
}));

import {
  sendNativeEmailOtp,
  verifyNativeEmailOtp,
} from "../../native-app/src/auth-otp";

describe("native Kaify OTP client (resend contract)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setSession.mockReset();
  });

  it("posts build-20 payload and reads resendAfterSeconds", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({
        success: true,
        data: { sent: true, resendAfterSeconds: 60 },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendNativeEmailOtp("user@example.com");
    expect(result).toEqual({ ok: true, resendAfterSeconds: 60 });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://kaifyai.org/api/auth/otp/send",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-Client-Version": "native-1.0.2",
        }),
      }),
    );
    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as { body: string }).body,
    );
    expect(body).toEqual({ email: "user@example.com", locale: "en" });
    expect(body.recaptchaToken).toBeUndefined();
    expect(body.recaptchaEnterpriseToken).toBeUndefined();
  });

  it("maps OTP_RESEND_COOLDOWN Retry-After for the UI timer", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({ "Retry-After": "42" }),
      json: async () => ({
        success: false,
        error: {
          code: "OTP_RESEND_COOLDOWN",
          message: "Yeni kod istemeden önce lütfen biraz bekle.",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendNativeEmailOtp("user@example.com");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("OTP_RESEND_COOLDOWN");
    expect(result.retryAfterSeconds).toBe(42);
    expect(result.message).toContain("bekle");
  });

  it("sets supabase session from verify response tokens", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({
        success: true,
        data: {
          verified: true,
          session: {
            accessToken: "access",
            refreshToken: "refresh",
          },
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    setSession.mockResolvedValue({ error: null });

    const result = await verifyNativeEmailOtp("user@example.com", "123456");
    expect(result).toEqual({ ok: true });
    expect(setSession).toHaveBeenCalledWith({
      access_token: "access",
      refresh_token: "refresh",
    });
  });
});
