import { describe, expect, it } from "vitest";
import { ERROR_BUDGET, SLO } from "@/lib/scalability/slo";
import {
  HEALTH_ERROR_RATE_MAX,
  HEALTH_P95_MS,
  HEALTH_P99_MS,
} from "../../scripts/load-test/slo.config.mjs";

describe("SLO registry", () => {
  it("keeps health thresholds aligned with load-test config", () => {
    expect(SLO.health.p95Ms).toBe(HEALTH_P95_MS);
    expect(SLO.health.p99Ms).toBe(HEALTH_P99_MS);
    expect(SLO.health.errorRateMax).toBe(HEALTH_ERROR_RATE_MAX);
  });

  it("orders read endpoints by strictness", () => {
    expect(SLO.market.p95Ms).toBeLessThan(SLO.leaderboard.p95Ms);
    expect(SLO.leaderboard.p95Ms).toBeLessThan(SLO.analytics.p95Ms);
    expect(SLO.analytics.p95Ms).toBeLessThan(SLO.home.p95Ms);
  });

  it("defines error budgets below 100%", () => {
    expect(ERROR_BUDGET.healthAvailability).toBeGreaterThan(0.99);
    expect(ERROR_BUDGET.readApiAvailability).toBeGreaterThan(0.99);
  });
});
