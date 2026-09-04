import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatInboxTime,
  formatNumber,
  formatRelativeShort,
  formatTime,
} from "@/lib/i18n/format";

const t = (key: string, params?: Record<string, string | number>) => {
  if (key === "common.yesterday") return "Dün";
  if (key === "common.relative.now") return "şimdi";
  if (key === "common.relative.minutes") return `${params?.count}dk`;
  if (key === "common.relative.hours") return `${params?.count}sa`;
  if (key === "common.relative.days") return `${params?.count}g`;
  return key;
};

describe("locale-aware formatting", () => {
  it("uses Turkish number separators", () => {
    expect(formatNumber(12_345.6, "tr")).toBe("12.345,6");
  });

  it("localizes yesterday instead of returning a hardcoded label", () => {
    const now = new Date("2026-08-05T12:00:00.000Z");
    expect(
      formatInboxTime("2026-08-04T10:00:00.000Z", "tr", t, now),
    ).toBe("Dün");
  });

  it("formats time and datetime with the active locale", () => {
    const stamp = new Date("2026-08-05T15:30:00.000Z");
    expect(formatTime(stamp, "tr")).toMatch(/\d/);
    expect(formatDateTime(stamp, "en")).toMatch(/2026|8|5/);
  });

  it("formats calendar dates with the active locale", () => {
    const day = new Date("2026-03-15T12:00:00.000Z");
    const tr = formatDate(day, "tr", { month: "long" });
    const en = formatDate(day, "en", { month: "long" });
    expect(tr.toLowerCase()).toContain("mart");
    expect(en.toLowerCase()).toContain("march");
  });

  it("formats short relative timestamps", () => {
    const now = Date.parse("2026-08-05T12:00:00.000Z");
    expect(
      formatRelativeShort("2026-08-05T11:59:30.000Z", "tr", t, now),
    ).toBe("şimdi");
    expect(
      formatRelativeShort("2026-08-05T11:45:00.000Z", "tr", t, now),
    ).toBe("15dk");
  });
});
