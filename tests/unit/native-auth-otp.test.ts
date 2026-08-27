import { afterEach, describe, expect, it, vi } from "vitest";

const setSession = vi.fn();
const executeNative = vi.fn();

vi.mock("../../native-app/src/session", () => ({
  supabase: {
    auth: {
      setSession: (...args: unknown[]) => setSession(...args),
    },
  },
}));

vi.mock("../../native-app/src/recaptcha-enterprise", async () => {
  const actual = await vi.importActual<
    typeof import("../../native-app/src/recaptcha-enterprise")
  >("../../native-app/src/recaptcha-enterprise");
  return {
    ...actual,
    executeNativeRecaptchaEnterprise: (...args: unknown[]) =>
      executeNative(...args),
  };
});

import {
  sendNativeEmailOtp,
  verifyNativeEmailOtp,
} from "../../native-app/src/auth-otp";

describe("native Kaify OTP client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setSession.mockReset();
    executeNative.mockReset();
  });

  it("posts send with enterprise token body+header and surfaces API errors", async () => {
    executeNative.mockResolvedValue({
      ok: true,
      token: "ios-enterprise-token-abcdefghijklmnopqrstuvwxyz",
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        success: false,
        error: { code: "FORBIDDEN", message: "reCAPTCHA failed" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendNativeEmailOtp("user@example.com");
    expect(result).toEqual({ ok: false, message: "reCAPTCHA failed" });
    expect(executeNative).toHaveBeenCalledWith("otp_send");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://kaifyai.org/api/auth/otp/send",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-Recaptcha-Enterprise-Token":
            "ios-enterprise-token-abcdefghijklmnopqrstuvwxyz",
        }),
      }),
    );
    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as { body: string }).body,
    );
    expect(body.recaptchaEnterpriseToken).toBe(
      "ios-enterprise-token-abcdefghijklmnopqrstuvwxyz",
    );
    expect(body.recaptchaPlatform).toBe("ios");
    expect(body.recaptchaToken).toBeUndefined();
  });

  it("surfaces SDK timeout/network errors before calling the API", async () => {
    executeNative.mockResolvedValue({
      ok: false,
      message: "Security verification timed out. Please try again.",
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendNativeEmailOtp("user@example.com");
    expect(result.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sets supabase session from verify response tokens", async () => {
    executeNative.mockResolvedValue({
      ok: true,
      token: "ios-enterprise-token-abcdefghijklmnopqrstuvwxyz",
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
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
    expect(executeNative).toHaveBeenCalledWith("otp_verify");
    expect(setSession).toHaveBeenCalledWith({
      access_token: "access",
      refresh_token: "refresh",
    });
  });

  it("does not advance when verify omits native session tokens", async () => {
    executeNative.mockResolvedValue({
      ok: true,
      token: "ios-enterprise-token-abcdefghijklmnopqrstuvwxyz",
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { verified: true },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyNativeEmailOtp("user@example.com", "123456");
    expect(result.ok).toBe(false);
    expect(setSession).not.toHaveBeenCalled();
  });
});
