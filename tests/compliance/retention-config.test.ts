import { describe, expect, it } from "vitest";
import {
  RETENTION,
  RETENTION_WARNING_DAYS,
  addDaysIso,
  daysAgoIso,
  monthsAgoDate,
  monthsAgoIso,
} from "@/lib/compliance/retention-config";

describe("RETENTION constants", () => {
  it("defines expected purge periods", () => {
    expect(RETENTION.chatMonths).toBe(24);
    expect(RETENTION.coachingMemoryMonths).toBe(24);
    expect(RETENTION.analyticsMonths).toBe(36);
    expect(RETENTION.healthStepsMonths).toBe(36);
    expect(RETENTION.notificationsMonths).toBe(12);
    expect(RETENTION_WARNING_DAYS).toBe(30);
  });
});

describe("monthsAgoIso", () => {
  it("returns an ISO string roughly N months in the past", () => {
    const iso = monthsAgoIso(24);
    const d = new Date(iso);
    const now = new Date();
    const diffMonths =
      (now.getUTCFullYear() - d.getUTCFullYear()) * 12 +
      (now.getUTCMonth() - d.getUTCMonth());
    expect(diffMonths).toBeGreaterThanOrEqual(23);
    expect(diffMonths).toBeLessThanOrEqual(25);
  });
});

describe("daysAgoIso", () => {
  it("returns an ISO string roughly N days in the past", () => {
    const iso = daysAgoIso(30);
    const diffDays = (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThanOrEqual(29);
    expect(diffDays).toBeLessThanOrEqual(31);
  });
});

describe("monthsAgoDate", () => {
  it("returns a YYYY-MM-DD date string", () => {
    expect(monthsAgoDate(1)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("addDaysIso", () => {
  it("adds days to an ISO timestamp", () => {
    const base = "2026-01-01T00:00:00.000Z";
    expect(addDaysIso(base, 30)).toBe("2026-01-31T00:00:00.000Z");
  });
});
