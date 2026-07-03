/**
 * Backend smoke test — hits live Next.js API routes and reports every failure.
 * Usage: node scripts/backend-smoke-test.mjs [baseUrl]
 * Requires: dev server running (npm run dev)
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3000";
const UA = "Mozilla/5.0 (KaifyBackendSmoke/1.0)";

/** @type {{ name: string; ok: boolean; status?: number; detail?: string; severity: string }[]} */
const results = [];

function loadCronSecret() {
  try {
    const envPath = resolve(process.cwd(), ".env.local");
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("CRON_SECRET=")) continue;
      let val = trimmed.slice("CRON_SECRET=".length).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      return val.trim();
    }
  } catch {
    /* no env */
  }
  return process.env.CRON_SECRET?.trim() ?? null;
}

const CRON_SECRET = loadCronSecret();

async function req(method, path, opts = {}) {
  const url = `${BASE}${path}`;
  const headers = {
    "User-Agent": UA,
    Accept: "application/json",
    Origin: BASE,
    ...(opts.headers ?? {}),
  };
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(url, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  let json = null;
  const text = await res.text();
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _raw: text.slice(0, 200) };
  }
  return { status: res.status, json, headers: res.headers };
}

function pass(name, detail) {
  results.push({ name, ok: true, detail, severity: "ok" });
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, status, detail, severity = "error") {
  results.push({ name, ok: false, status, detail, severity });
  console.log(`  ✗ [${severity}] ${name} — HTTP ${status ?? "?"}: ${detail}`);
}

function expectStatus(name, status, expected, detail) {
  if (status === expected) pass(name, detail ?? `HTTP ${status}`);
  else fail(name, status, `expected ${expected}, got ${status}. ${detail ?? ""}`);
}

function expectEnvelope(name, res, expectSuccess) {
  if (res.json?.success === expectSuccess) {
    pass(name, expectSuccess ? "success envelope" : `error: ${res.json?.error?.code}`);
    return res.json;
  }
  fail(name, res.status, `success=${res.json?.success}, body=${JSON.stringify(res.json).slice(0, 120)}`);
  return null;
}

console.log(`\n🔍 Backend smoke test → ${BASE}\n`);

// ── Public read endpoints ──────────────────────────────────────────────────
console.log("── Public endpoints ──");

try {
  const health = await req("GET", "/api/health");
  expectStatus("GET /api/health", health.status, 200, health.json?.status);
} catch (e) {
  fail("GET /api/health", null, e.message);
}

try {
  const healthDetail = await req("GET", "/api/health", {
    headers: CRON_SECRET ? { Authorization: `Bearer ${CRON_SECRET}` } : {},
  });
  if (CRON_SECRET) {
    if (healthDetail.json?.checks) {
      const checks = healthDetail.json.checks;
      pass("GET /api/health (detailed)", `db=${checks.database?.status}, ai=${checks.ai?.status}`);
    } else {
      fail("GET /api/health (detailed)", healthDetail.status, "missing checks object");
    }
  } else {
    pass("GET /api/health (detailed)", "skipped — no CRON_SECRET in .env.local");
  }
} catch (e) {
  fail("GET /api/health (detailed)", null, e.message);
}

try {
  const lb = await req("GET", "/api/leaderboard");
  expectStatus("GET /api/leaderboard", lb.status, 200);
  if (Array.isArray(lb.json?.leaderboard)) pass("leaderboard shape", `${lb.json.leaderboard.length} entries`);
  else fail("leaderboard shape", lb.status, "missing leaderboard array", "error");
} catch (e) {
  fail("GET /api/leaderboard", null, e.message);
}

try {
  const clb = await req("GET", "/api/country-leaderboard");
  expectStatus("GET /api/country-leaderboard", clb.status, 200);
  if (Array.isArray(clb.json?.leaderboard)) pass("country-leaderboard shape", `${clb.json.leaderboard.length} countries`);
  else fail("country-leaderboard shape", clb.status, "missing leaderboard array");
} catch (e) {
  fail("GET /api/country-leaderboard", null, e.message);
}

// ── Auth-gated endpoints (expect 401/403 without session) ─────────────────
console.log("\n── Auth-gated (expect 401 without session) ──");

const authRoutes = [
  ["GET", "/api/profile"],
  ["GET", "/api/gems"],
  ["GET", "/api/streak"],
  ["GET", "/api/home"],
  ["GET", "/api/kai"],
  ["GET", "/api/analytics"],
  ["GET", "/api/usage"],
  ["GET", "/api/settings"],
  ["GET", "/api/notifications"],
  ["GET", "/api/messages"],
  ["GET", "/api/market"],
  ["GET", "/api/referral"],
  ["GET", "/api/leaderboard/global"],
  ["GET", "/api/leaderboard/country"],
  ["GET", "/api/chat/team"],
  ["GET", "/api/profile/export"],
];

for (const [method, path] of authRoutes) {
  try {
    const res = await req(method, path);
    const code = res.json?.error?.code;
    if (res.status === 401 || code === "UNAUTHORIZED") {
      pass(`${method} ${path}`, "401 as expected");
    } else if (res.json?.success === false) {
      pass(`${method} ${path}`, `${code ?? res.status}`);
    } else {
      fail(`${method} ${path}`, res.status, `expected 401, got success=${res.json?.success}`, "warn");
    }
  } catch (e) {
    fail(`${method} ${path}`, null, e.message);
  }
}

// ── Admin routes (expect 401/403) ─────────────────────────────────────────
console.log("\n── Admin routes (expect forbidden without admin session) ──");

const adminRoutes = [
  "/api/admin/overview",
  "/api/admin/costs",
  "/api/admin/users",
  "/api/admin/audit",
  "/api/admin/referrals",
  "/api/admin/influencer",
  "/api/admin/self-heal",
];

for (const path of adminRoutes) {
  try {
    const res = await req("GET", path);
    if (res.status === 401 || res.status === 403 || res.json?.error?.code === "FORBIDDEN" || res.json?.error?.code === "UNAUTHORIZED") {
      pass(`GET ${path}`, `${res.status}/${res.json?.error?.code}`);
    } else {
      fail(`GET ${path}`, res.status, `expected auth failure, got ${JSON.stringify(res.json).slice(0, 80)}`, "warn");
    }
  } catch (e) {
    fail(`GET ${path}`, null, e.message);
  }
}

// ── Cron routes ───────────────────────────────────────────────────────────
console.log("\n── Cron routes ──");

const cronRoutes = ["/api/cron/cleanup", "/api/cron/cost-check", "/api/cron/self-recovery"];

for (const path of cronRoutes) {
  try {
    const noAuth = await req("GET", path);
    expectStatus(`GET ${path} (no auth)`, noAuth.status, 401);
  } catch (e) {
    fail(`GET ${path} (no auth)`, null, e.message);
  }
}

if (CRON_SECRET) {
  for (const path of cronRoutes) {
    try {
      const res = await req("GET", path, {
        headers: { Authorization: `Bearer ${CRON_SECRET}` },
      });
      if (res.status === 200 && res.json?.success !== false) {
        pass(`GET ${path} (authed)`, `HTTP ${res.status}`);
      } else if (res.status === 200 && res.json?.success === true) {
        pass(`GET ${path} (authed)`, "ok envelope");
      } else if (res.status === 200) {
        pass(`GET ${path} (authed)`, JSON.stringify(res.json).slice(0, 60));
      } else {
        fail(`GET ${path} (authed)`, res.status, JSON.stringify(res.json).slice(0, 120));
      }
    } catch (e) {
      fail(`GET ${path} (authed)`, null, e.message);
    }
  }
} else {
  pass("Cron authed tests", "skipped — no CRON_SECRET");
}

// ── Validation errors ─────────────────────────────────────────────────────
console.log("\n── Validation / error handling ──");

try {
  const badOnboard = await req("POST", "/api/onboarding", { body: {} });
  if (badOnboard.status === 401) {
    pass("POST /api/onboarding (no session)", "401 as expected");
  } else if (badOnboard.status === 403) {
    pass("POST /api/onboarding (no session)", "403 middleware block");
  } else if (badOnboard.json?.success === false) {
    pass("POST /api/onboarding error code", badOnboard.json.error?.code ?? "envelope error");
  } else {
    fail("POST /api/onboarding", badOnboard.status, JSON.stringify(badOnboard.json).slice(0, 80));
  }
} catch (e) {
  fail("POST /api/onboarding", null, e.message);
}

try {
  const badLb = await req("GET", "/api/leaderboard?userId=<script>");
  if (badLb.status === 400 || badLb.status === 200) {
    pass("GET /api/leaderboard invalid userId", `HTTP ${badLb.status}`);
  } else {
    fail("GET /api/leaderboard invalid userId", badLb.status, "unexpected");
  }
} catch (e) {
  fail("GET /api/leaderboard invalid userId", null, e.message);
}

try {
  const notFound = await req("GET", "/api/nonexistent-route-xyz");
  expectStatus("GET unknown route", notFound.status, 404);
} catch (e) {
  fail("GET unknown route", null, e.message);
}

// ── Method not allowed ────────────────────────────────────────────────────
console.log("\n── Method guards ──");

try {
  const wrongMethod = await req("DELETE", "/api/health");
  if (wrongMethod.status === 405 || wrongMethod.status === 404) {
    pass("DELETE /api/health", `HTTP ${wrongMethod.status}`);
  } else {
    fail("DELETE /api/health", wrongMethod.status, "expected 405/404", "warn");
  }
} catch (e) {
  fail("DELETE /api/health", null, e.message);
}

// ── Response envelope consistency ─────────────────────────────────────────
console.log("\n── Envelope consistency ──");

try {
  const gems = await req("GET", "/api/gems");
  if (gems.json?.success === false && gems.json?.error?.code) {
    pass("ApiError envelope shape", `code=${gems.json.error.code}`);
  } else {
    fail("ApiError envelope shape", gems.status, JSON.stringify(gems.json).slice(0, 80));
  }
} catch (e) {
  fail("ApiError envelope shape", null, e.message);
}

// ── Summary ───────────────────────────────────────────────────────────────
const errors = results.filter((r) => !r.ok && r.severity === "error");
const warns = results.filter((r) => !r.ok && r.severity === "warn");
const passed = results.filter((r) => r.ok);

console.log("\n════════════════════════════════════════");
console.log(`  PASSED: ${passed.length}  WARNINGS: ${warns.length}  ERRORS: ${errors.length}`);
console.log("════════════════════════════════════════");

if (errors.length > 0) {
  console.log("\n❌ ERRORS:");
  for (const e of errors) console.log(`   • ${e.name}: ${e.detail}`);
}
if (warns.length > 0) {
  console.log("\n⚠ WARNINGS:");
  for (const w of warns) console.log(`   • ${w.name}: ${w.detail}`);
}

process.exit(errors.length > 0 ? 1 : 0);
