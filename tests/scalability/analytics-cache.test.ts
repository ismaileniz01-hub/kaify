import { describe, expect, it, vi } from "vitest";
import { CacheInvalidation } from "@/lib/cache/keys";

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
  readLatestWeightKg: vi.fn().mockResolvedValue(null),
  readLatestGoalRow: vi.fn().mockResolvedValue(null),
  readNutritionRecommendationProfile: vi.fn().mockResolvedValue(null),
  readProfileWeightKg: vi.fn().mockResolvedValue(null),
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
    expect(keys).toContain("analytics:bundle:v2:user-1");
    expect(keys).toContain("analytics:today:v2:user-1");
    expect(keys.some((k) => k.startsWith("home:bundle:v3:user-1"))).toBe(true);
    expect(keys.length).toBeGreaterThanOrEqual(3);
  });
});

describe("getAnalyticsBundle", () => {
  it("uses cached wrapper with bundle key", async () => {
    const { cached } = await import("@/lib/cache");
    const { getAnalyticsBundle } = await import("@/lib/services/analytics.service");

    await getAnalyticsBundle("user-1");

    expect(cached).toHaveBeenCalledWith(
      "analytics:bundle:v2:user-1",
      120,
      expect.any(Function),
    );
  });

  it("maps Monday-to-today targets and maintenance fallbacks into calorie history", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-26T12:00:00.000Z"));
    const repository = await import("@/lib/repositories/analytics-read.repository");
    vi.mocked(repository.readLatestGoalRow).mockResolvedValueOnce({
      maintenance_calorie_goal: 2100,
      calorie_goal: 1800,
      workouts_target: 4,
      water_goal_liters: 2.5,
      protein_goal_g: 120,
      carbs_goal_g: 200,
      fat_goal_g: 60,
    });
    vi.mocked(repository.readWeeklyAnalyticsSummary).mockResolvedValueOnce([
      {
        entry_date: "2026-08-24",
        calories_consumed: 1600,
        calories_burned: 200,
        calorie_goal: 1700,
        maintenance_calorie_goal: null,
        protein_g: 100,
        carbs_g: 150,
        fat_g: 50,
        protein_goal_g: 120,
        workouts_completed: 1,
      },
      {
        entry_date: "2026-08-25",
        calories_consumed: 1750,
        calories_burned: 0,
        calorie_goal: 1750,
        maintenance_calorie_goal: 2200,
        protein_g: 110,
        carbs_g: 170,
        fat_g: 55,
        protein_goal_g: 120,
        workouts_completed: 0,
      },
    ] as never);

    const { loadAnalyticsBundle } = await import("@/lib/services/analytics.service");
    const bundle = await loadAnalyticsBundle("user-1");

    expect(bundle.calorieHistory.map((day) => day.date)).toEqual([
      "2026-08-24",
      "2026-08-25",
      "2026-08-26",
    ]);
    expect(bundle.calorieHistory.map((day) => day.calorieGoal)).toEqual([
      1700, 1750, 1800,
    ]);
    expect(bundle.calorieHistory.map((day) => day.maintenanceCalories)).toEqual([
      2100, 2200, 2100,
    ]);
    expect(bundle.calorieHistory.map((day) => day.foodLogged)).toEqual([
      true, true, false,
    ]);
    vi.useRealTimers();
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
      "analytics:today:v2:user-1",
      120,
      expect.any(Function),
    );
  });
});
