/**
 * Service level objectives — Scalability Faz 4 source of truth.
 * Keep in sync with scripts/load-test/slo.config.mjs and docs/scalability/slo.md
 */

export const SLO = {
  /** Anonymous health probe (CI load smoke target). */
  health: {
    p95Ms: 800,
    p99Ms: 1500,
    errorRateMax: 0.01,
  },
  /** Authenticated read APIs (production monitoring target). */
  readApi: {
    p95Ms: 300,
    errorRateMax: 0.005,
  },
  home: { p95Ms: 500 },
  analytics: { p95Ms: 400 },
  leaderboard: { p95Ms: 200 },
  market: { p95Ms: 150 },
  checkIn: { p95Ms: 300 },
  /** AI chat — time to first byte; streaming thereafter. */
  chatTtfb: { p95Ms: 2000 },
} as const;

/** Monthly error budget at SLO target (1 - availability). */
export const ERROR_BUDGET = {
  healthAvailability: 0.999,
  readApiAvailability: 0.995,
} as const;

export type SloEndpoint = keyof typeof SLO;
