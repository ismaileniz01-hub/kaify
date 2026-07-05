#!/usr/bin/env node
/**
 * Faz 3 verification helper — runs local checks that map to Verification Sprint B/C.
 */
import { spawnSync } from "node:child_process";

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log("=== Faz 3 Verification Sprint (local) ===\n");

run("npm", ["test", "--", "tests/security"]);
run("node", ["scripts/security/ai-injection-redteam.mjs"]);

console.log("\nManual steps (see docs/security/verification-2026-07.md):");
console.log(" - Apply migrations 20260705160000_faz3");
console.log(" - RPC bypass: perform_daily_check_in as authenticated → denied");
console.log(" - MFA enrolled user AAL1 → API 403");
console.log(" - securityheaders.com → A or A+");
console.log(" - ZAP baseline on staging (CI weekly workflow)");

console.log("\n[verify-faz3] automated checks passed");
