import { describe, expect, it } from "vitest";
import { maximumBirthDateForMinimumAge, meetsMinimumAge } from "@/lib/compliance/age";

describe("meetsMinimumAge", () => {
  it("accepts users aged 16+", () => {
    expect(meetsMinimumAge("2000-01-01")).toBe(true);
  });

  it("rejects users under 16", () => {
    const today = new Date();
    const year = today.getUTCFullYear() - 10;
    expect(meetsMinimumAge(`${year}-01-01`)).toBe(false);
  });

  it("respects birthday not yet reached this year", () => {
    const today = new Date();
    const year = today.getUTCFullYear() - 16;
    const month = String(today.getUTCMonth() + 2).padStart(2, "0");
    expect(meetsMinimumAge(`${year}-${month}-01`)).toBe(false);
  });
});

describe("maximumBirthDateForMinimumAge", () => {
  it("returns an ISO date string", () => {
    expect(maximumBirthDateForMinimumAge()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
