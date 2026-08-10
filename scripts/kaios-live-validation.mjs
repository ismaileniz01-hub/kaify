#!/usr/bin/env node
/**
 * KAIOS live staging validation probe + test runner.
 *
 * Usage:
 *   node scripts/kaios-live-validation.mjs
 *   KAIOS_LIVE=1 node scripts/kaios-live-validation.mjs
 *
 * Writes kaios/live-evidence/environment-probe.json
 * When credentials exist and KAIOS_LIVE=1, runs vitest live suites + optional Playwright.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function present(value) {
  const v = (value ?? "").trim();
  if (!v) return false;
  const lower = v.toLowerCase();
  return !(
    lower.includes("your_") ||
    lower.includes("changeme") ||
    lower.includes("replace_me") ||
    lower.includes("_here")
  );
}

const probe = {
  capturedAt: new Date().toISOString(),
  deepseek: present(process.env.DEEPSEEK_API_KEY),
  gemini: present(process.env.GEMINI_API_KEY),
  supabase:
    present(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    present(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  supabaseServiceRole: present(process.env.SUPABASE_SERVICE_ROLE_KEY),
  stagingUrl: present(
    process.env.STAGING_URL ?? process.env.PLAYWRIGHT_BASE_URL,
  ),
  e2eAuth:
    process.env.E2E_AUTH_ENABLED === "1" &&
    present(process.env.E2E_OTP_EMAIL) &&
    present(process.env.E2E_OTP_CODE),
  dualUser:
    present(process.env.KAIOS_LIVE_USER_A_ID) &&
    present(process.env.KAIOS_LIVE_USER_B_ID) &&
    present(process.env.KAIOS_LIVE_USER_A_JWT) &&
    present(process.env.KAIOS_LIVE_USER_B_JWT),
  councilEntitledUser: present(process.env.KAIOS_LIVE_COUNCIL_USER_ID),
};

const dir = join(process.cwd(), "kaios/live-evidence");
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, "environment-probe.json"), JSON.stringify(probe, null, 2));

console.log("KAIOS live environment probe:");
console.log(JSON.stringify(probe, null, 2));

const anyProvider = probe.deepseek || probe.gemini;
const readyForPartial = anyProvider || (probe.supabase && probe.dualUser);

if (!readyForPartial) {
  const blocked = {
    capturedAt: probe.capturedAt,
    status: "BLOCKED",
    reason:
      "No DeepSeek/Gemini/Supabase dual-user credentials in this environment. Live sections remain NOT TESTED.",
    probe,
  };
  writeFileSync(join(dir, "STATUS.json"), JSON.stringify(blocked, null, 2));
  console.error("\nLIVE VALIDATION BLOCKED — credentials missing.");
  process.exitCode = 0; // do not fail CI; evidence is the blocker report
  process.exit(0);
}

if (process.env.KAIOS_LIVE !== "1") {
  writeFileSync(
    join(dir, "STATUS.json"),
    JSON.stringify(
      {
        capturedAt: probe.capturedAt,
        status: "READY_BUT_NOT_EXECUTED",
        reason: "Credentials detected but KAIOS_LIVE=1 not set. Re-run with KAIOS_LIVE=1.",
        probe,
      },
      null,
      2,
    ),
  );
  console.log("\nCredentials present. Set KAIOS_LIVE=1 to execute live suites.");
  process.exit(0);
}

const liveTests = spawnSync(
  "npx",
  ["vitest", "run", "tests/kaios/live"],
  { stdio: "inherit", env: process.env },
);

if (probe.e2eAuth && probe.stagingUrl) {
  spawnSync("npx", ["playwright", "test", "e2e/kaios-flows.spec.ts"], {
    stdio: "inherit",
    env: {
      ...process.env,
      PLAYWRIGHT_BASE_URL:
        process.env.PLAYWRIGHT_BASE_URL ?? process.env.STAGING_URL,
    },
  });
}

const status = {
  capturedAt: new Date().toISOString(),
  status: liveTests.status === 0 ? "EXECUTED" : "EXECUTED_WITH_FAILURES",
  vitestExit: liveTests.status,
  probe,
  artifacts: [
    "environment-probe.json",
    "deepseek-conversational.json",
    "gemini-vision.json",
    "supabase-multi-user.json",
    "maya-e2e.json",
    "council-e2e.json",
  ].filter((f) => existsSync(join(dir, f))),
};
writeFileSync(join(dir, "STATUS.json"), JSON.stringify(status, null, 2));
process.exit(liveTests.status ?? 1);
