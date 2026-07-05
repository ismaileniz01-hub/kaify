import { describe, expect, it } from "vitest";
import { maskUserId, resolveLeaderboardUserId } from "@/lib/privacy/mask-user-id";

describe("mask-user-id", () => {
  const uuid = "550e8400-e29b-41d4-a716-446655440000";

  it("returns a stable 12-char hash for the same input", () => {
    expect(maskUserId(uuid)).toHaveLength(12);
    expect(maskUserId(uuid)).toBe(maskUserId(uuid));
  });

  it("does not return the raw uuid", () => {
    expect(maskUserId(uuid)).not.toBe(uuid);
  });

  it("exposes raw id only to the viewer themselves", () => {
    expect(resolveLeaderboardUserId(uuid, uuid)).toBe(uuid);
    expect(resolveLeaderboardUserId(uuid, "other-user")).toBe(maskUserId(uuid));
  });
});
