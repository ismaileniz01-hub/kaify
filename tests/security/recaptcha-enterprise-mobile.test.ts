import { afterEach, describe, expect, it, vi } from "vitest";
import {
  evaluateRecaptchaEnterpriseMobileAssessment,
  isRecaptchaEnterpriseMobileConfigured,
  RECAPTCHA_ENTERPRISE_ACTION_OTP_SEND,
} from "@/lib/security/recaptcha-enterprise-mobile";
import {
  extractRecaptchaEnterpriseToken,
  validateOtpCaptcha,
} from "@/lib/security/otp-captcha";

describe("reCAPTCHA Enterprise mobile assessment evaluation", () => {
  it("accepts valid ios token properties + score for otp_send", () => {
    const decision = evaluateRecaptchaEnterpriseMobileAssessment(
      {
        tokenProperties: {
          valid: true,
          action: "otp_send",
          iosBundleId: "org.kaifyai.app",
        },
        riskAnalysis: { score: 0.9 },
      },
      RECAPTCHA_ENTERPRISE_ACTION_OTP_SEND,
      { bundleId: "org.kaifyai.app", minScore: 0.5 },
    );
    expect(decision).toEqual({ ok: true, score: 0.9 });
  });

  it("rejects wrong action and does not confuse with web hostname checks", () => {
    const decision = evaluateRecaptchaEnterpriseMobileAssessment(
      {
        tokenProperties: {
          valid: true,
          action: "login",
          iosBundleId: "org.kaifyai.app",
        },
        riskAnalysis: { score: 0.9 },
      },
      RECAPTCHA_ENTERPRISE_ACTION_OTP_SEND,
    );
    expect(decision).toEqual({ ok: false, reason: "wrong_action" });
  });

  it("rejects invalid token and low score", () => {
    expect(
      evaluateRecaptchaEnterpriseMobileAssessment(
        { tokenProperties: { valid: false, action: "otp_send" } },
        "otp_send",
      ).reason,
    ).toBe("invalid_token");

    expect(
      evaluateRecaptchaEnterpriseMobileAssessment(
        {
          tokenProperties: {
            valid: true,
            action: "otp_send",
            iosBundleId: "org.kaifyai.app",
          },
          riskAnalysis: { score: 0.1 },
        },
        "otp_send",
        { minScore: 0.5 },
      ).reason,
    ).toBe("low_score");
  });

  it("rejects mismatched ios bundle id", () => {
    expect(
      evaluateRecaptchaEnterpriseMobileAssessment(
        {
          tokenProperties: {
            valid: true,
            action: "otp_send",
            iosBundleId: "com.evil.app",
          },
          riskAnalysis: { score: 0.9 },
        },
        "otp_send",
        { bundleId: "org.kaifyai.app" },
      ).reason,
    ).toBe("wrong_bundle");
  });
});

describe("OTP captcha routing", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("extracts enterprise token from body or dedicated header (not Origin)", () => {
    const req = new Request("https://kaifyai.org/api/auth/otp/send", {
      headers: {
        origin: "capacitor://localhost",
        "x-recaptcha-enterprise-token": "enterprise-token-value-123456",
      },
    });
    expect(extractRecaptchaEnterpriseToken(req, null)).toBe(
      "enterprise-token-value-123456",
    );
    expect(
      extractRecaptchaEnterpriseToken(
        new Request("https://kaifyai.org/api/auth/otp/send", {
          headers: { origin: "capacitor://localhost" },
        }),
        "body-enterprise-token-abcdef",
      ),
    ).toBe("body-enterprise-token-abcdef");
  });

  it("does not treat Origin as captcha proof when enterprise config missing in prod", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RECAPTCHA_ENTERPRISE_PROJECT_ID", "");
    vi.stubEnv("RECAPTCHA_ENTERPRISE_API_KEY", "");
    vi.stubEnv("RECAPTCHA_ENTERPRISE_IOS_SITE_KEY", "");
    expect(isRecaptchaEnterpriseMobileConfigured()).toBe(false);

    const ok = await validateOtpCaptcha({
      request: new Request("https://kaifyai.org/api/auth/otp/send", {
        headers: { origin: "capacitor://localhost" },
      }),
      recaptchaEnterpriseToken: "enterprise-token-value-1234567890",
      recaptchaPlatform: "ios",
      expectedEnterpriseAction: RECAPTCHA_ENTERPRISE_ACTION_OTP_SEND,
    });
    expect(ok).toBe(false);
  });
});
