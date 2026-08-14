import { describe, expect, it } from "vitest";
import { evaluateRecaptchaResponse, recaptchaMinScore } from "@/lib/security/recaptcha";

const host = "kaify.org";
const freshTs = () => new Date().toISOString();

describe("evaluateRecaptchaResponse", () => {
  it("accepts a successful v2 invisible response", () => {
    const decision = evaluateRecaptchaResponse({
      success: true,
      hostname: host,
      challenge_ts: freshTs(),
    });
    expect(decision).toEqual({ ok: true });
  });

  it("rejects unsuccessful tokens", () => {
    expect(evaluateRecaptchaResponse({ success: false, hostname: host }).reason).toBe(
      "unsuccessful",
    );
  });

  it("rejects low v3 scores when score is present", () => {
    expect(
      evaluateRecaptchaResponse({
        success: true,
        hostname: host,
        score: 0.1,
        challenge_ts: freshTs(),
      }).reason,
    ).toBe("low_score");
    expect(recaptchaMinScore()).toBeGreaterThan(0.1);
  });

  it("rejects unexpected hostnames", () => {
    expect(
      evaluateRecaptchaResponse({
        success: true,
        hostname: "evil.example",
        challenge_ts: freshTs(),
      }).reason,
    ).toBe("wrong_hostname");
  });

  it("rejects expired challenge_ts", () => {
    const old = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    expect(
      evaluateRecaptchaResponse({
        success: true,
        hostname: host,
        challenge_ts: old,
      }).reason,
    ).toBe("expired");
  });

  it("rejects malformed challenge_ts", () => {
    expect(
      evaluateRecaptchaResponse({
        success: true,
        hostname: host,
        challenge_ts: "not-a-date",
      }).reason,
    ).toBe("malformed");
  });

  it("rejects wrong action when both env and payload provide it", () => {
    const prev = process.env.RECAPTCHA_EXPECTED_ACTION;
    process.env.RECAPTCHA_EXPECTED_ACTION = "login";
    try {
      expect(
        evaluateRecaptchaResponse({
          success: true,
          hostname: host,
          action: "signup",
          challenge_ts: freshTs(),
        }).reason,
      ).toBe("wrong_action");
    } finally {
      if (prev === undefined) delete process.env.RECAPTCHA_EXPECTED_ACTION;
      else process.env.RECAPTCHA_EXPECTED_ACTION = prev;
    }
  });
});
