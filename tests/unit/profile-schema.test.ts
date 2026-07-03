import { describe, expect, it } from "vitest";
import { profileUpdateSchema, isValidTimezone } from "@/lib/validations/profile.schema";

describe("isValidTimezone", () => {
  it("accepts valid IANA zones", () => {
    expect(isValidTimezone("Europe/Istanbul")).toBe(true);
    expect(isValidTimezone("UTC")).toBe(true);
    expect(isValidTimezone("America/New_York")).toBe(true);
  });

  it("rejects invalid or oversized zones", () => {
    expect(isValidTimezone("")).toBe(false);
    expect(isValidTimezone("Not/AZone")).toBe(false);
    expect(isValidTimezone("X".repeat(65))).toBe(false);
  });
});

describe("profileUpdateSchema", () => {
  it("accepts a valid partial update", () => {
    const parsed = profileUpdateSchema.safeParse({ displayName: "Ada" });
    expect(parsed.success).toBe(true);
  });

  it("rejects unknown / protected keys (strict)", () => {
    const parsed = profileUpdateSchema.safeParse({ tier: "premium_max" });
    expect(parsed.success).toBe(false);
  });

  it("requires at least one field", () => {
    const parsed = profileUpdateSchema.safeParse({});
    expect(parsed.success).toBe(false);
  });

  it("uppercases country code", () => {
    const parsed = profileUpdateSchema.safeParse({ countryCode: "tr" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.countryCode).toBe("TR");
  });

  it("rejects out-of-range height", () => {
    expect(profileUpdateSchema.safeParse({ heightCm: 10 }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ heightCm: 300 }).success).toBe(false);
  });

  it("rejects an invalid timezone", () => {
    expect(profileUpdateSchema.safeParse({ timezone: "Mars/Base" }).success).toBe(false);
  });
});
