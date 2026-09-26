import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";

const eq = vi.fn();
const cancelSub = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: () => ({
    from: (table: string) => {
      if (table === "paddle_subscriptions") {
        return {
          select: () => ({ eq }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

vi.mock("@/lib/billing/paddle-server", () => ({
  isPaddleServerConfigured: () => Boolean(process.env.PADDLE_API_KEY?.trim()),
  getPaddleServerClient: () => ({
    subscriptions: {
      cancel: (...args: unknown[]) => cancelSub(...args),
    },
  }),
}));

import { cancelUserSubscriptionsImmediately } from "@/lib/services/billing-portal.service";

beforeEach(() => {
  eq.mockReset();
  cancelSub.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("cancelUserSubscriptionsImmediately", () => {
  it("no-ops when there are no live subscriptions", async () => {
    eq.mockResolvedValue({
      data: [{ subscription_id: "sub_old", status: "canceled" }],
      error: null,
    });
    await expect(cancelUserSubscriptionsImmediately("user-1")).resolves.toBeUndefined();
    expect(cancelSub).not.toHaveBeenCalled();
  });

  it("throws SERVICE_UNAVAILABLE when live subs exist but Paddle is not configured", async () => {
    vi.stubEnv("PADDLE_API_KEY", "");
    eq.mockResolvedValue({
      data: [{ subscription_id: "sub_live", status: "active" }],
      error: null,
    });
    await expect(cancelUserSubscriptionsImmediately("user-1")).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
    } satisfies Partial<ApiError>);
    expect(cancelSub).not.toHaveBeenCalled();
  });

  it("cancels live subscriptions immediately", async () => {
    vi.stubEnv("PADDLE_API_KEY", "pdl_test");
    eq.mockResolvedValue({
      data: [
        { subscription_id: "sub_live", status: "active" },
        { subscription_id: "sub_done", status: "canceled" },
      ],
      error: null,
    });
    cancelSub.mockResolvedValue({});
    await cancelUserSubscriptionsImmediately("user-1");
    expect(cancelSub).toHaveBeenCalledTimes(1);
    expect(cancelSub).toHaveBeenCalledWith("sub_live", { effectiveFrom: "immediately" });
  });

  it("throws CONFLICT when Paddle cancel fails", async () => {
    vi.stubEnv("PADDLE_API_KEY", "pdl_test");
    eq.mockResolvedValue({
      data: [{ subscription_id: "sub_live", status: "active" }],
      error: null,
    });
    cancelSub.mockRejectedValue(new Error("paddle 500"));
    await expect(cancelUserSubscriptionsImmediately("user-1")).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });
});
