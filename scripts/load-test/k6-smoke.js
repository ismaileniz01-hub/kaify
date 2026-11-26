/**
 * k6 smoke — CI gate for /api/health + optional authenticated hot paths.
 *
 * Usage:
 *   k6 run scripts/load-test/k6-smoke.js
 *   BASE_URL=http://localhost:3000 k6 run scripts/load-test/k6-smoke.js
 *   K6_ACCESS_TOKEN=<supabase jwt> k6 run scripts/load-test/k6-hotpaths.js
 *
 * This file stays CI-safe (anonymous health only). Hot paths live in k6-hotpaths.js.
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

const BASE = __ENV.BASE_URL || "http://localhost:3000";
const P95_MS = Number(__ENV.SLO_HEALTH_P95_MS || 800);

// /api/health is rate limited per IP (10/min), so a burst from one runner gets
// 429s by design. A 429 is the limiter working, not a failure. The SLO is:
// no server errors, fast answers (including fast 429s), and the probe does
// answer 200 when it is under the limit.
http.setResponseCallback(http.expectedStatuses(200, 429));
const serverErrors = new Rate("server_errors");
const healthyAnswers = new Counter("healthy_answers");
// Latency of real health answers only; fast 429s must not hide a slow handler.
const healthyLatency = new Trend("healthy_latency", true);

export const options = {
  vus: Number(__ENV.K6_VUS || 5),
  duration: __ENV.K6_DURATION || "10s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    server_errors: ["rate<0.01"],
    healthy_answers: ["count>0"],
    healthy_latency: [`p(95)<${P95_MS}`],
    http_req_duration: [`p(95)<${P95_MS}`],
  },
};

export default function smoke() {
  const res = http.get(`${BASE}/api/health`, {
    headers: { "User-Agent": "KaifyK6Smoke/1.0" },
    tags: { name: "health" },
  });
  serverErrors.add(res.status >= 500 || res.status === 0);
  if (res.status === 200) {
    healthyAnswers.add(1);
    healthyLatency.add(res.timings.duration);
  }
  check(res, {
    "status is 200 or rate-limited 429": (r) => r.status === 200 || r.status === 429,
  });
  sleep(0.05);
}
