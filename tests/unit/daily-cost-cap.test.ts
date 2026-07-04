import { afterEach, describe, expect, it, vi } from "vitest";

const from = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: () => ({ from }),
}));

import {
  assertUserDailyAiBudget,
  userDailyTokenHardCap,
} from "@/lib/ai/daily-cost-cap";
import { ApiError } from "@/lib/api/errors";

function mockLedger(totalTokens: number[]) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockResolvedValue({
      data: totalTokens.map((t) => ({ total_tokens: t })),
      error: null,
    }),
  };
  from.mockReturnValue(chain);
  return chain;
}

afterEach(() => {
  vi.clearAllMocks();
  delete process.env.AI_COST_USER_DAILY_TOKENS_CAP;
});

describe("daily-cost-cap", () => {
  it("userDailyTokenHardCap defaults to 150_000", () => {
    expect(userDailyTokenHardCap()).toBe(150_000);
  });

  it("allows usage below the cap", async () => {
    mockLedger([10_000, 20_000]);
    await expect(assertUserDailyAiBudget("u1")).resolves.toBeUndefined();
  });

  it("blocks usage at or above the cap", async () => {
    process.env.AI_COST_USER_DAILY_TOKENS_CAP = "50000";
    mockLedger([30_000, 25_000]);

    await expect(assertUserDailyAiBudget("u1")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("fails open when ledger read errors", async () => {
    from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockResolvedValue({ data: null, error: { message: "db down" } }),
    });

    await expect(assertUserDailyAiBudget("u1")).resolves.toBeUndefined();
  });
});
