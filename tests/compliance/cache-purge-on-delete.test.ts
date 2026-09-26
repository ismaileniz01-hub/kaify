import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CachePatterns } from "@/lib/cache/keys";
import { EXPLICIT_CLEANUP } from "@/lib/compliance/deletion-config";

describe("account deletion cache purge (PRIV-001)", () => {
  it("documents cache:user in explicit cleanup registry", () => {
    expect(EXPLICIT_CLEANUP.some((t) => t.table === "cache:user")).toBe(true);
  });

  it("deleteUserAccount cancels Paddle billing before auth deletion", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/services/account.service.ts"),
      "utf8",
    );
    const cancel = src.indexOf("cancelUserSubscriptionsImmediately");
    const authDelete = src.indexOf("admin.auth.admin.deleteUser");
    expect(cancel).toBeGreaterThan(-1);
    expect(authDelete).toBeGreaterThan(cancel);
  });

  it("deleteUserAccount calls purgeUserCaches after auth deletion", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/services/account.service.ts"),
      "utf8",
    );
    expect(src).toContain("purgeUserCaches");
    const authDelete = src.indexOf("admin.auth.admin.deleteUser");
    const purge = src.indexOf("await purgeUserCaches");
    expect(authDelete).toBeGreaterThan(-1);
    expect(purge).toBeGreaterThan(authDelete);
  });

  it("purgeUserCaches covers home, analytics, session, rank, avatar namespaces", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/cache/invalidate.ts"),
      "utf8",
    );
    expect(src).toContain("CachePatterns.homeBundleAll");
    expect(src).toContain("CachePatterns.analyticsUser");
    expect(src).toContain("CachePatterns.sessionSlices");
    expect(src).toContain("CachePatterns.leaderboardRank");
    expect(src).toContain("CachePatterns.avatarSigned");
  });

  it("cache patterns are user-scoped", () => {
    const uid = "11111111-1111-1111-1111-111111111111";
    expect(CachePatterns.homeBundleAll(uid)).toContain(uid);
    expect(CachePatterns.avatarSigned(uid)).toContain(uid);
    expect(CachePatterns.analyticsUser(uid)).toContain(uid);
  });
});
