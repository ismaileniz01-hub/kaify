import { afterEach, describe, expect, it, vi } from "vitest";

const checkRateLimit = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimit(...args),
}));

import { enforceUserRateLimit, AI_RATE_LIMITS } from "@/lib/api/rate-guard";
import { ApiError } from "@/lib/api/errors";

afterEach(() => vi.clearAllMocks());

describe("enforceUserRateLimit", () => {
  it("passes silently when the request is allowed", async () => {
    checkRateLimit.mockResolvedValue({ allowed: true, remaining: 5, limit: 20, resetMs: 1000 });
    await expect(enforceUserRateLimit("u1", "chat")).resolves.toBeUndefined();
  });

  it("scopes the key by action and user, using the action's config", async () => {
    checkRateLimit.mockResolvedValue({ allowed: true, remaining: 1, limit: 10, resetMs: 0 });
    await enforceUserRateLimit("u42", "analyze");
    expect(checkRateLimit).toHaveBeenCalledWith("ai:analyze:u42", AI_RATE_LIMITS.analyze, {
      failClosedInProduction: true,
    });
  });

  it("fail-opens session bootstrap when Upstash is unavailable", async () => {
    checkRateLimit.mockResolvedValue({ allowed: true, remaining: 80, limit: 90, resetMs: 0 });
    await enforceUserRateLimit("u1", "session");
    expect(checkRateLimit).toHaveBeenCalledWith("ai:session:u1", AI_RATE_LIMITS.session, {
      failClosedInProduction: false,
    });
  });

  it("keeps session limits high enough for auth refresh storms", () => {
    expect(AI_RATE_LIMITS.session.requests).toBeGreaterThanOrEqual(60);
  });

  it("throws RATE_LIMITED when the limit is exceeded", async () => {
    checkRateLimit.mockResolvedValue({ allowed: false, remaining: 0, limit: 3, resetMs: 5000 });
    await expect(enforceUserRateLimit("u1", "team_meeting")).rejects.toMatchObject({
      code: "RATE_LIMITED",
    });
    await expect(enforceUserRateLimit("u1", "team_meeting")).rejects.toBeInstanceOf(ApiError);
  });

  it("defines a config for every advertised action", () => {
    for (const action of Object.keys(AI_RATE_LIMITS) as (keyof typeof AI_RATE_LIMITS)[]) {
      expect(AI_RATE_LIMITS[action].requests).toBeGreaterThan(0);
      expect(AI_RATE_LIMITS[action].windowMs).toBeGreaterThan(0);
    }
  });
});
