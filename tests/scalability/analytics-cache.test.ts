import { describe, expect, it, vi } from "vitest";
import { CacheInvalidation, CacheKeys } from "@/lib/cache/keys";

vi.mock("@/lib/cache", () => ({
  cached: vi.fn((_key: string, _ttl: number, producer: () => Promise<unknown>) =>
    producer(),
  ),
  cacheDelete: vi.fn(),
}));

vi.mock("@/lib/repositories/analytics-read.repository", () => ({
  createAnalyticsReadClient: vi.fn(),
  createAnalyticsAdminReadClient: vi.fn(),
  readAnalyticsDailyRow: vi.fn().mockResolvedValue(null),
  readHealthStepsRange: vi.fn().mockResolvedValue([]),
  readPreviousWeightKg: vi.fn().mockResolvedValue(null),
  readUserTimezone: vi.fn().mockResolvedValue("UTC"),
  readLeoAnalysisMessages: vi.fn().mockResolvedValue([]),
  readMayaAnalysisMessages: vi.fn().mockResolvedValue([]),
  readWeeklyAnalyticsSummary: vi.fn().mockResolvedValue([]),
  readMealTotalsRow: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/repositories/analytics-write.repository", () => ({
  writeAnalyticsDailyPatch: vi.fn(),
  writeHealthStepsBatch: vi.fn(),
  invalidateAnalyticsUserCache: vi.fn(),
}));

describe("analytics read cache keys", () => {
  it("invalidates bundle and today keys together", () => {
    const keys = CacheInvalidation.analyticsUser("user-1");
    expect(keys).toContain("analytics:bundle:v1:user-1");
    expect(keys).toContain("analytics:today:v1:user-1");
    expect(keys.some((k) => k.startsWith("home:bundle:v1:user-1:"))).toBe(true);
    expect(keys.length).toBeGreaterThanOrEqual(3);
  });
});

describe("getAnalyticsBundle", () => {
  it("uses cached wrapper with bundle key", async () => {
    const { cached } = await import("@/lib/cache");
    const { getAnalyticsBundle } = await import("@/lib/services/analytics.service");

    await getAnalyticsBundle("user-1");

    expect(cached).toHaveBeenCalledWith(
      "analytics:bundle:v1:user-1",
      120,
      expect.any(Function),
    );
  });
});

describe("getTodayNutritionSnapshot", () => {
  it("uses cached wrapper with today key", async () => {
    const { cached } = await import("@/lib/cache");
    const { getTodayNutritionSnapshot } = await import(
      "@/lib/services/analytics.service"
    );

    await getTodayNutritionSnapshot("user-1");

    expect(cached).toHaveBeenCalledWith(
      "analytics:today:v1:user-1",
      120,
      expect.any(Function),
    );
  });
});
