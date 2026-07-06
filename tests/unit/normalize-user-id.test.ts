import { describe, expect, it } from "vitest";
import { normalizeUserId } from "@/lib/utils/user-id";

describe("normalizeUserId", () => {
  const uuid = "388fd97b-5dda-40e0-bbed-8c9783cc7ecd";

  it("returns a bare uuid unchanged", () => {
    expect(normalizeUserId(uuid)).toBe(uuid);
  });

  it("extracts uuid from prefixed paste text", () => {
    expect(normalizeUserId(`ör. ${uuid}`)).toBe(uuid);
    expect(normalizeUserId(`e.g. ${uuid}`)).toBe(uuid);
  });

  it("returns null for invalid input", () => {
    expect(normalizeUserId("")).toBeNull();
    expect(normalizeUserId("not-a-uuid")).toBeNull();
  });
});
