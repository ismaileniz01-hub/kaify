import { describe, expect, it } from "vitest";
import {
  formatInboxTime,
  formatNumber,
} from "@/lib/i18n/format";

const t = (key: string) => (key === "common.yesterday" ? "Dün" : key);

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
});
