import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/profile.service", () => ({
  getOwnProfile: vi.fn().mockResolvedValue({ id: "u1", displayName: "Test" }),
}));
vi.mock("@/lib/services/gem-balance.service", () => ({
  getGemBalance: vi.fn().mockResolvedValue({ balance: 100, totalEarned: 0, totalSpent: 0 }),
}));
vi.mock("@/lib/services/streak-status.service", () => ({
  getStreakStatus: vi.fn().mockResolvedValue({ currentStreak: 3, longestStreak: 5 }),
}));
vi.mock("@/lib/services/referral.service", () => ({
  getReferralSummary: vi.fn().mockResolvedValue({ referralCode: "ABC123" }),
}));
vi.mock("@/lib/services/kai-state.service", () => ({
  getKaiState: vi.fn().mockResolvedValue({
    unlockedLevel: 2,
    activeAura: "default",
    ownedEffectIds: [],
  }),
}));
vi.mock("@/lib/services/home.service", () => ({
  getHomeData: vi.fn().mockResolvedValue({
    displayName: "Test",
    motivation: "Go",
    dailyTip: "Tip",
    kaiFoodInsight: null,
    stats: { steps: null, streak: 3, goalPercent: null },
    kaiLevel: 2,
  }),
}));
vi.mock("@/lib/cache", () => ({
  cachedWithStale: vi.fn((_key, _ttl, _stale, producer) => producer()),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: { role: "user" }, error: null }),
        })),
      })),
    })),
  })),
}));

describe("getSessionBundle", () => {
  it("loads all bootstrap fields in one parallel call", async () => {
    const { getSessionBundle } = await import("@/lib/services/session.service");
    const { getOwnProfile } = await import("@/lib/services/profile.service");
    const { getGemBalance } = await import("@/lib/services/gem-balance.service");
    const { getKaiState } = await import("@/lib/services/kai-state.service");

    const bundle = await getSessionBundle("u1");

    expect(getOwnProfile).toHaveBeenCalledWith("u1");
    expect(getGemBalance).toHaveBeenCalledWith("u1");
    expect(getKaiState).toHaveBeenCalledWith("u1");
    expect(bundle.referral.referralCode).toBe("ABC123");
    expect(bundle.home.displayName).toBe("Test");
    expect(bundle.kai.unlockedLevel).toBe(2);
    expect(bundle.isAdmin).toBe(false);
  });
});
