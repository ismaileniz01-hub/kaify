/**
 * k6 smoke — CI gate for /api/health latency + error rate.
 *
 * Usage:
 *   k6 run scripts/load-test/k6-smoke.js
 *   BASE_URL=http://localhost:3000 k6 run scripts/load-test/k6-smoke.js
 */
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE_URL || "http://localhost:3000";
const P95_MS = Number(__ENV.SLO_HEALTH_P95_MS || 800);

export const options = {
  vus: Number(__ENV.K6_VUS || 5),
  duration: __ENV.K6_DURATION || "10s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: [`p(95)<${P95_MS}`],
  },
};

export default function () {
  const res = http.get(`${BASE}/api/health`, {
    headers: { "User-Agent": "KaifyK6Smoke/1.0" },
    tags: { name: "health" },
  });
  check(res, {
    "status is 200": (r) => r.status === 200,
  });
  sleep(0.05);
}
