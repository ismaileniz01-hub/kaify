import { afterEach, describe, expect, it, vi } from "vitest";

const checkRateLimit = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimit(...args),
}));

import {
  enforceOtpTargetRateLimit,
  enforcePublicRateLimit,
  OTP_TARGET_RATE_LIMIT,
  AI_RATE_LIMITS,
} from "@/lib/api/rate-guard";
import { hashEmail } from "@/lib/api-security";
import { ApiError } from "@/lib/api/errors";

afterEach(() => vi.clearAllMocks());

describe("OTP target rate limit (SEC-003)", () => {
  it("keys the bucket by email hash, never plaintext", async () => {
    checkRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 4,
      limit: 5,
      resetMs: 0,
    });
    const hash = await hashEmail("User@Example.COM");
    await enforceOtpTargetRateLimit(hash);
    expect(checkRateLimit).toHaveBeenCalledWith(
      `pub:otp_send:target:${hash}`,
      OTP_TARGET_RATE_LIMIT,
      { failClosedInProduction: true },
    );
    const key = String(checkRateLimit.mock.calls[0][0]);
    expect(key).not.toContain("User");
    expect(key).not.toContain("example.com");
  });

  it("normalizes equivalent addresses to the same hash bucket", async () => {
    const a = await hashEmail("foo@bar.com");
    const b = await hashEmail("  FOO@BAR.COM ");
    expect(a).toBe(b);
  });

  it("throws RATE_LIMITED when the target bucket is exhausted", async () => {
    checkRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      limit: 5,
      resetMs: 60_000,
    });
    await expect(
      enforceOtpTargetRateLimit("abc123"),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("keeps IP limiting independent of target limiting", async () => {
    checkRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 1,
      limit: 12,
      resetMs: 0,
    });
    await enforcePublicRateLimit("1.2.3.4", "otp_send");
    expect(checkRateLimit).toHaveBeenCalledWith(
      "pub:otp_send:1.2.3.4",
      AI_RATE_LIMITS.otp_send,
      { failClosedInProduction: true },
    );
  });

  it("allows fewer target sends than IP sends (defence in depth)", () => {
    expect(OTP_TARGET_RATE_LIMIT.requests).toBeLessThan(
      AI_RATE_LIMITS.otp_send.requests,
    );
    expect(OTP_TARGET_RATE_LIMIT.windowMs).toBe(AI_RATE_LIMITS.otp_send.windowMs);
  });
});
