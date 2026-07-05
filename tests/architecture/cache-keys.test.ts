import { describe, expect, it } from "vitest";
import { CacheKeys, CacheTTL } from "@/lib/cache/keys";

describe("cache keys registry", () => {
  it("uses stable market catalog key", () => {
    expect(CacheKeys.marketItems()).toBe("market:items:v2");
  });

  it("scopes analytics per user", () => {
    expect(CacheKeys.analyticsBundle("abc")).toBe("analytics:bundle:v1:abc");
    expect(CacheKeys.analyticsToday("abc")).toBe("analytics:today:v1:abc");
    expect(CacheKeys.analyticsUser("abc")).toBe("analytics:bundle:v1:abc");
  });

  it("parameterizes leaderboard keys", () => {
    expect(CacheKeys.leaderboardGlobal(50, 0)).toBe("lb:global:v1:50:0");
    expect(CacheKeys.leaderboardCountry(10)).toBe("lb:country:v1:10");
  });

  it("defines positive TTLs", () => {
    expect(CacheTTL.marketCatalog).toBeGreaterThan(0);
    expect(CacheTTL.leaderboardHot).toBeLessThan(CacheTTL.leaderboardStale);
    expect(CacheTTL.coachesCatalog).toBeGreaterThan(CacheTTL.homeBundle);
  });

  it("scopes home bundle per user and day", () => {
    expect(CacheKeys.homeBundle("u1", "2026-07-05")).toBe(
      "home:bundle:v1:u1:2026-07-05",
    );
  });
});
