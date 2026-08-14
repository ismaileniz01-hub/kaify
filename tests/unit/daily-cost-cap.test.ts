import { afterEach, describe, expect, it, vi } from "vitest";

const from = vi.fn();
const cacheGet = vi.fn();
const cacheSet = vi.fn();
const enterDegradedMode = vi.fn();
const getCronCostSnapshot = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: () => ({ from }),
}));
vi.mock("@/lib/cache", () => ({
  cacheGet: (...args: unknown[]) => cacheGet(...args),
  cacheSet: (...args: unknown[]) => cacheSet(...args),
}));
vi.mock("@/lib/resilience/degraded-mode", () => ({
  enterDegradedMode: (...args: unknown[]) => enterDegradedMode(...args),
}));
vi.mock("@/lib/services/cost-cron.service", () => ({
  getCronCostSnapshot: (...args: unknown[]) => getCronCostSnapshot(...args),
}));

import {
  assertPlatformDailyAiBudget,
  assertUserDailyAiBudget,
  platformDailyUsdHardCap,
  userDailyTokenHardCap,
} from "@/lib/ai/daily-cost-cap";

function mockDailyUsage(totalTokens: number | null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: totalTokens === null ? null : { total_tokens: totalTokens },
      error: null,
    }),
  };
  from.mockReturnValue(chain);
  return chain;
}

afterEach(() => {
  vi.clearAllMocks();
  delete process.env.AI_COST_USER_DAILY_TOKENS_CAP;
  delete process.env.AI_COST_PLATFORM_DAILY_USD_CAP;
  delete process.env.AI_COST_PLATFORM_PRESSURE_RATIO;
});

describe("daily-cost-cap", () => {
  it("userDailyTokenHardCap defaults to 150_000", () => {
    expect(userDailyTokenHardCap()).toBe(150_000);
  });

  it("platformDailyUsdHardCap defaults to 75", () => {
    expect(platformDailyUsdHardCap()).toBe(75);
  });

  it("allows usage below the cap", async () => {
    mockDailyUsage(30_000);
    await expect(assertUserDailyAiBudget("u1")).resolves.toBeUndefined();
  });

  it("blocks usage at or above the cap", async () => {
    process.env.AI_COST_USER_DAILY_TOKENS_CAP = "50000";
    mockDailyUsage(55_000);

    await expect(assertUserDailyAiBudget("u1")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("fails closed in production when ledger read errors", async () => {
    vi.stubEnv("NODE_ENV", "production");
    from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: "db down" } }),
    });
    await expect(assertUserDailyAiBudget("u1")).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
    });
    vi.unstubAllEnvs();
  });

  it("fails open outside production when ledger read errors", async () => {
    vi.stubEnv("NODE_ENV", "test");
    from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: "db down" } }),
    });
    await expect(assertUserDailyAiBudget("u1")).resolves.toBeUndefined();
    vi.unstubAllEnvs();
  });

  it("platform hard cap enters degraded mode and blocks AI", async () => {
    process.env.AI_COST_PLATFORM_DAILY_USD_CAP = "10";
    cacheGet.mockResolvedValue(null);
    from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { estimated_usd_micro: 12_000_000, total_tokens: 1_000_000 },
        error: null,
      }),
    });

    await expect(assertPlatformDailyAiBudget()).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
    });
    expect(enterDegradedMode).toHaveBeenCalled();
  });

  it("platform cap disabled with 0", async () => {
    process.env.AI_COST_PLATFORM_DAILY_USD_CAP = "0";
    await expect(assertPlatformDailyAiBudget()).resolves.toBeUndefined();
    expect(getCronCostSnapshot).not.toHaveBeenCalled();
  });
});
