import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Data-integrity guarantees of the AI quota layer:
 *  - a denied reservation must throw (never silently allow an over-limit call)
 *  - settle/refund with a non-positive amount must be a no-op (no phantom
 *    increments or negative refunds that would corrupt the usage counter)
 *  - refunds with a positive amount must reach the underlying RPC
 */

const checkAndIncrementUsage = vi.fn();
const refundUsage = vi.fn();

vi.mock("@/lib/services/usage-limit.service", () => ({
  checkAndIncrementUsage: (...args: unknown[]) => checkAndIncrementUsage(...args),
  refundUsage: (...args: unknown[]) => refundUsage(...args),
}));

import {
  reserveQuota,
  settleQuota,
  refundQuota,
  checkQuotaGuard,
} from "@/lib/ai/quota-guard";
import { ApiError } from "@/lib/api/errors";

function allowResult(overrides: Record<string, unknown> = {}) {
  return {
    allowed: true,
    warning_trigger: null,
    resource: "text_tokens",
    used: 10,
    limit: 100,
    remaining: 90,
    percent: 10,
    ...overrides,
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("quota-guard integrity", () => {
  it("reserveQuota reserves the requested amount and returns the result", async () => {
    checkAndIncrementUsage.mockResolvedValue(allowResult());
    const result = await reserveQuota({
      userId: "u1",
      resource: "text_tokens",
      amount: 500,
    });
    expect(checkAndIncrementUsage).toHaveBeenCalledWith({
      userId: "u1",
      resource: "text_tokens",
      amount: 500,
    });
    expect(result.allowed).toBe(true);
  });

  it("reserveQuota throws FORBIDDEN when the limit is exhausted", async () => {
    checkAndIncrementUsage.mockResolvedValue(
      allowResult({ allowed: false, warning_trigger: "LIMIT_100", used: 100, remaining: 0 }),
    );
    await expect(
      reserveQuota({ userId: "u1", resource: "text_tokens", amount: 500 }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("settleQuota is a no-op for a non-positive amount", async () => {
    expect(await settleQuota({ userId: "u1", resource: "text_tokens", amount: 0 })).toBeNull();
    expect(await settleQuota({ userId: "u1", resource: "text_tokens", amount: -5 })).toBeNull();
    expect(checkAndIncrementUsage).not.toHaveBeenCalled();
  });

  it("settleQuota records extra consumption for a positive amount", async () => {
    checkAndIncrementUsage.mockResolvedValue(allowResult({ used: 42 }));
    await settleQuota({ userId: "u1", resource: "text_tokens", amount: 42 });
    expect(checkAndIncrementUsage).toHaveBeenCalledWith({
      userId: "u1",
      resource: "text_tokens",
      amount: 42,
    });
  });

  it("refundQuota is a no-op for a non-positive amount", async () => {
    await refundQuota({ userId: "u1", resource: "text_tokens", amount: 0 });
    await refundQuota({ userId: "u1", resource: "text_tokens", amount: -3 });
    expect(refundUsage).not.toHaveBeenCalled();
  });

  it("refundQuota returns reserved quota for a positive amount", async () => {
    refundUsage.mockResolvedValue(undefined);
    await refundQuota({ userId: "u1", resource: "text_tokens", amount: 500 });
    expect(refundUsage).toHaveBeenCalledWith({
      userId: "u1",
      resource: "text_tokens",
      amount: 500,
    });
  });

  it("checkQuotaGuard probes with amount 0 and throws when not allowed", async () => {
    checkAndIncrementUsage.mockResolvedValue(allowResult({ allowed: false }));
    await expect(
      checkQuotaGuard({ userId: "u1", resource: "maya_photo" }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(checkAndIncrementUsage).toHaveBeenCalledWith({
      userId: "u1",
      resource: "maya_photo",
      amount: 0,
    });
  });
});
