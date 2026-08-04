import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";

const maybeSingle = vi.fn();
const order = vi.fn();
const createPortal = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: () => ({
    from: (table: string) => {
      if (table === "paddle_customers") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle }),
          }),
        };
      }
      if (table === "paddle_subscriptions") {
        return {
          select: () => ({
            eq: () => ({
              order: (...args: unknown[]) => order(...args),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

vi.mock("@/lib/billing/paddle-server", () => ({
  isPaddleServerConfigured: () => Boolean(process.env.PADDLE_API_KEY?.trim()),
  getPaddleServerClient: () => ({
    customerPortalSessions: {
      create: (...args: unknown[]) => createPortal(...args),
    },
  }),
}));

import { createCustomerPortalUrl } from "@/lib/services/billing-portal.service";

beforeEach(() => {
  maybeSingle.mockReset();
  order.mockReset();
  createPortal.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("createCustomerPortalUrl", () => {
  it("throws SERVICE_UNAVAILABLE when Paddle API key missing", async () => {
    vi.stubEnv("PADDLE_API_KEY", "");
    await expect(createCustomerPortalUrl("user-1")).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
    } satisfies Partial<ApiError>);
  });

  it("throws NOT_FOUND when no mirrored Paddle customer", async () => {
    vi.stubEnv("PADDLE_API_KEY", "pdl_test");
    maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(createCustomerPortalUrl("user-1")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("mints a portal URL from customer + subscription ids", async () => {
    vi.stubEnv("PADDLE_API_KEY", "pdl_test");
    maybeSingle.mockResolvedValue({
      data: { customer_id: "ctm_123" },
      error: null,
    });
    order.mockResolvedValue({
      data: [{ subscription_id: "sub_a" }, { subscription_id: "sub_b" }],
      error: null,
    });
    createPortal.mockResolvedValue({
      urls: { general: { overview: "https://paddle.example/portal" } },
    });

    await expect(createCustomerPortalUrl("user-1")).resolves.toBe(
      "https://paddle.example/portal",
    );
    expect(createPortal).toHaveBeenCalledWith("ctm_123", ["sub_a", "sub_b"]);
  });
});
