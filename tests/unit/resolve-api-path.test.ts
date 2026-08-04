import { describe, expect, it } from "vitest";
import { resolveApiPath } from "@/lib/api/resolve-api-path";

describe("resolveApiPath", () => {
  it("rewrites hot paths to /api/v1", () => {
    expect(resolveApiPath("/api/home")).toBe("/api/v1/home");
    expect(resolveApiPath("/api/session")).toBe("/api/v1/session");
    expect(resolveApiPath("/api/chat/maya?limit=30")).toBe(
      "/api/v1/chat/maya?limit=30",
    );
    expect(resolveApiPath("/api/market/chest")).toBe("/api/v1/market/chest");
    expect(resolveApiPath("/api/analytics/confirm")).toBe(
      "/api/v1/analytics/confirm",
    );
  });

  it("maps legacy leaderboard aliases", () => {
    expect(resolveApiPath("/api/leaderboard")).toBe("/api/v1/leaderboard/global");
    expect(resolveApiPath("/api/leaderboard?limit=10")).toBe(
      "/api/v1/leaderboard/global?limit=10",
    );
    expect(resolveApiPath("/api/country-leaderboard")).toBe(
      "/api/v1/leaderboard/country",
    );
  });

  it("leaves excluded and already-v1 paths alone", () => {
    expect(resolveApiPath("/api/v1/home")).toBe("/api/v1/home");
    expect(resolveApiPath("/api/health")).toBe("/api/health");
    expect(resolveApiPath("/api/admin/costs")).toBe("/api/admin/costs");
    expect(resolveApiPath("/api/waitlist")).toBe("/api/waitlist");
    expect(resolveApiPath("/api/gifts/claim")).toBe("/api/gifts/claim");
    expect(resolveApiPath("/api/paddle/webhook")).toBe("/api/paddle/webhook");
  });
});
