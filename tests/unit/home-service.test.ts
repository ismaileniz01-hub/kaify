import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/profile.service", () => ({
  getOwnProfile: vi.fn().mockResolvedValue({
    id: "u1",
    displayName: "Ada",
    locale: "en",
    timezone: "UTC",
  }),
}));
vi.mock("@/lib/services/streak-status.service", () => ({
  getStreakStatus: vi.fn().mockResolvedValue({
    currentStreak: 2,
    longestStreak: 4,
    lastCheckInDate: "2026-08-11",
    kaiUnlockedLevel: 1,
  }),
}));
vi.mock("@/lib/services/analytics.service", () => ({
  getTodayNutritionSnapshot: vi.fn().mockResolvedValue({
    entryDate: "2026-08-11",
    weightKg: null,
    caloriesConsumed: 500,
    caloriesBurned: 0,
    calorieGoal: 2000,
    workoutsCompleted: 0,
    workoutsTarget: 5,
    waterLiters: 1,
    waterGoalLiters: 2.5,
    steps: 1000,
    proteinG: 40,
    carbsG: 50,
    fatG: 20,
    proteinGoalG: 150,
    carbsGoalG: 250,
    fatGoalG: 65,
  }),
}));
vi.mock("@/lib/services/settings.service", () => ({
  getUserSettings: vi.fn().mockResolvedValue({ goalsConfigured: true, primaryGoal: "stay_fit" }),
}));
vi.mock("@/lib/motivation-quotes", () => ({
  getDailyMotivationQuote: vi.fn().mockResolvedValue("Move today"),
}));
vi.mock("@/lib/i18n/dictionary", () => ({
  resolveLocale: (v: string | null | undefined) => v ?? "en",
  translateKey: vi.fn().mockResolvedValue("Tip text"),
}));
vi.mock("@/lib/date-utils", () => ({
  localTodayDate: () => "2026-08-11",
}));
vi.mock("@/lib/kai-food-insight", () => ({
  buildKaiFoodInsight: vi.fn().mockReturnValue("Insight"),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            limit: () => ({
              maybeSingle: async () => ({ data: null }),
            }),
          }),
        }),
      }),
    }),
  }),
}));
vi.mock("@/lib/activation/today-job", () => ({
  resolveTodayJob: vi.fn().mockReturnValue({
    kind: "chat_kai",
    href: "/chat/kai",
    titleKey: "t",
    bodyKey: "b",
    ctaKey: "c",
  }),
}));

import { getHomeCoreData, localizeHomeData } from "@/lib/services/home.service";

describe("home.service locale-free core (PERF-002 / Wave 2)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getHomeCoreData returns nutrition + profileLocale without localized strings", async () => {
    const core = await getHomeCoreData("u1");
    expect(core.displayName).toBe("Ada");
    expect(core.profileLocale).toBe("en");
    expect(core.nutrition?.caloriesConsumed).toBe(500);
    expect(core).not.toHaveProperty("motivation");
    expect(core).not.toHaveProperty("dailyTip");
    expect(core.firstTask.chatDone).toBe(false);
  });

  it("localizeHomeData applies presentation strings for a locale", async () => {
    const core = await getHomeCoreData("u1");
    const dto = await localizeHomeData(core, "tr");
    expect(dto.motivation).toBe("Move today");
    expect(dto.dailyTip).toBe("Tip text");
    expect(dto.kaiFoodInsight).toBe("Insight");
    expect(dto.stats.streak).toBe(2);
  });
});
