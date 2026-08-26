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

describe("native Kaify OTP client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setSession.mockReset();
  });

  it("posts send to Kaify API and surfaces API errors", async () => {
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
    expect(fetchMock).toHaveBeenCalledWith(
      "https://kaifyai.org/api/auth/otp/send",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("sets supabase session from verify response tokens", async () => {
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
    expect(setSession).toHaveBeenCalledWith({
      access_token: "access",
      refresh_token: "refresh",
    });
  });

  it("does not advance when verify omits native session tokens", async () => {
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
