import { afterEach, describe, expect, it, vi } from "vitest";
import type { HomeDTO } from "@/lib/services/home.service";
import type { ProfileDTO } from "@/lib/types/domain.types";
import {
  clearHomePaint,
  readCachedUnreadCount,
  readHomePaint,
  writeCachedUnreadCount,
  writeHomePaint,
} from "@/lib/session/home-paint-cache";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => map.clear(),
  };
}

const profile = {
  displayName: "iso",
  locale: "en",
  timezone: "UTC",
} as ProfileDTO;

const home = {
  displayName: "iso",
  motivation: "Train insane or remain the same.",
  stats: { steps: 0, streak: 9, goalPercent: 0 },
} as HomeDTO;

describe("home paint cache", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("round-trips the last home screen and drops it on sign-out", () => {
    vi.stubGlobal("localStorage", memoryStorage());
    writeHomePaint({
      profile,
      gems: { balance: 1525, totalEarned: 2000, totalSpent: 475 },
      streak: {
        currentStreak: 9,
        longestStreak: 9,
        freezieBalance: 1,
        lastCheckInDate: "2026-10-05",
        kaiUnlockedLevel: 1,
      },
      home,
      kai: null,
      referralCode: "ISO",
      isAdmin: false,
    });
    writeCachedUnreadCount(12);

    expect(readHomePaint()?.gems.balance).toBe(1525);
    expect(readHomePaint()?.home.stats.streak).toBe(9);
    expect(readHomePaint()?.home.motivation).toContain("Train insane");
    expect(readCachedUnreadCount()).toBe(12);

    clearHomePaint();
    expect(readHomePaint()).toBeNull();
    expect(readCachedUnreadCount()).toBe(0);
  });

  it("ignores a corrupt or expired snapshot", () => {
    const store = memoryStorage();
    vi.stubGlobal("localStorage", store);
    store.setItem("kaify:home-paint:v1", "{");
    expect(readHomePaint()).toBeNull();

    store.setItem(
      "kaify:home-paint:v1",
      JSON.stringify({
        v: 1,
        savedAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
        profile,
        gems: { balance: 1, totalEarned: 1, totalSpent: 0 },
        streak: { currentStreak: 1 },
        home,
        kai: null,
        referralCode: "ISO",
        isAdmin: false,
      }),
    );
    expect(readHomePaint()).toBeNull();
  });
});
