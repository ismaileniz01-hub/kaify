import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CacheKeys, CachePatterns, CacheInvalidation } from "@/lib/cache/keys";
import { staleCompanionKey } from "@/lib/cache";
import {
  NOTIFICATIONS_EXPECTED_CADENCE,
  STREAK_RISK_HOURS,
  WATER_HOURS,
} from "@/app/api/cron/notifications/constants";

describe("home cache identity (PERF-002)", () => {
  it("uses locale-free v3 keys so presentation does not fragment identity", () => {
    expect(CacheKeys.homeBundle("u1", "2026-08-11")).toBe(
      "home:bundle:v3:u1:2026-08-11",
    );
    expect(CacheKeys.homeBundle("u1", "2026-08-11")).not.toContain(":tr");
    expect(CacheKeys.homeBundle("u1", "2026-08-11")).not.toContain(":default");
  });

  it("invalidation covers exact key, stale companion, and legacy pattern", () => {
    const userId = "user-abc";
    const exact = CacheInvalidation.homeBundle(userId);
    expect(exact).toEqual([CacheKeys.homeBundle(userId)]);
    expect(staleCompanionKey(exact[0]!)).toBe(`${exact[0]}:stale`);
    expect(CachePatterns.homeBundleAll(userId)).toBe(
      `home:bundle:*:${userId}:*`,
    );
  });

  it("home route and session both write via CacheKeys.homeBundle without locale", () => {
    const homeRoute = readFileSync(
      join(process.cwd(), "app/api/home/route.ts"),
      "utf8",
    );
    const session = readFileSync(
      join(process.cwd(), "lib/services/session.service.ts"),
      "utf8",
    );
    expect(homeRoute).toContain("CacheKeys.homeBundle(user.id)");
    expect(homeRoute).toContain("localizeHomeData");
    expect(homeRoute).not.toMatch(/homeBundle\([^)]+locale/);
    expect(session).toContain("CacheKeys.homeBundle(userId)");
    expect(session).toContain("getHomeCoreData");
  });

  it("invalidateHomeBundleCache deletes stale companions and legacy variants", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/cache/invalidate.ts"),
      "utf8",
    );
    expect(src).toContain("staleCompanionKey");
    expect(src).toContain("CachePatterns.homeBundleAll");
    expect(src).toContain("purgeUserCaches");
  });
});

describe("notification cadence coupling (REL-002)", () => {
  it("expects hourly execution for local-hour windows", () => {
    expect(NOTIFICATIONS_EXPECTED_CADENCE).toBe("hourly");
    expect(STREAK_RISK_HOURS.size).toBeGreaterThan(1);
    expect(WATER_HOURS.size).toBeGreaterThan(1);
  });

  it("keeps Vercel notifications cron as daily Hobby backup", () => {
    const vercel = JSON.parse(
      readFileSync(join(process.cwd(), "vercel.json"), "utf8"),
    ) as { crons: { path: string; schedule: string }[] };
    const entry = vercel.crons.find((c) =>
      c.path.includes("/api/cron/notifications"),
    );
    expect(entry?.schedule).toBe("0 6 * * *");
  });

  it("schedules production hourly cadence via pg_cron", () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        "supabase/migrations/20260804171000_faz1_pg_cron_vault_schedules.sql",
      ),
      "utf8",
    );
    expect(sql).toContain("kaify-notifications-hourly");
    expect(sql).toMatch(/'kaify-notifications-hourly'[\s\S]*?'0 \* \* \* \*'/);
  });
});
