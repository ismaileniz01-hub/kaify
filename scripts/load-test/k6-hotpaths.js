/**
 * k6 authenticated hot-path load (session + leaderboard + home).
 *
 * Requires a real user access token (Supabase JWT):
 *   K6_ACCESS_TOKEN=eyJ... BASE_URL=https://staging.example \
 *     k6 run scripts/load-test/k6-hotpaths.js
 *
 * Optional:
 *   K6_VUS=20 K6_DURATION=60s SLO_API_P95_MS=500
 */
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE_URL || "http://localhost:3000";
const TOKEN = __ENV.K6_ACCESS_TOKEN || "";
const P95_MS = Number(__ENV.SLO_API_P95_MS || 500);

export const options = {
  vus: Number(__ENV.K6_VUS || 10),
  duration: __ENV.K6_DURATION || "30s",
  thresholds: {
    http_req_failed: ["rate<0.02"],
    "http_req_duration{name:session}": [`p(95)<${P95_MS}`],
    "http_req_duration{name:leaderboard}": [`p(95)<${P95_MS}`],
    "http_req_duration{name:home}": [`p(95)<${P95_MS}`],
    "http_req_duration{name:workout_plan}": [`p(95)<${P95_MS}`],
  },
};

function authHeaders() {
  return {
    Authorization: `Bearer ${TOKEN}`,
    "User-Agent": "KaifyK6Hotpaths/1.0",
  };
}

export function setup() {
  if (!TOKEN) {
    throw new Error("K6_ACCESS_TOKEN is required for hot-path load test");
  }
}

export default function () {
  const session = http.get(`${BASE}/api/session`, {
    headers: authHeaders(),
    tags: { name: "session" },
  });
  check(session, {
    "session 200": (r) => r.status === 200,
  });

  const lb = http.get(`${BASE}/api/leaderboard?limit=50`, {
    headers: authHeaders(),
    tags: { name: "leaderboard" },
  });
  check(lb, {
    "leaderboard 200": (r) => r.status === 200,
  });

  const home = http.get(`${BASE}/api/home`, {
    headers: authHeaders(),
    tags: { name: "home" },
  });
  check(home, {
    "home 200": (r) => r.status === 200,
  });

  const workout = http.get(`${BASE}/api/workout/plan`, {
    headers: authHeaders(),
    tags: { name: "workout_plan" },
  });
  check(workout, {
    "workout plan 200": (r) => r.status === 200,
  });

  sleep(0.1);
}
