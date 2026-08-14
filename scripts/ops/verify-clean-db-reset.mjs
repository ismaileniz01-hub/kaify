#!/usr/bin/env node
/**
 * Verify `supabase db reset --yes` succeeds against the LOCAL stack only.
 * Never targets a linked/remote/production project.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONFIG = path.join(ROOT, "supabase", "config.toml");
const PROD_PROJECT_HINTS = ["urnetodzvszmddzdazdj", "kaifyai", "supabase.co"];

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function pass(message) {
  console.log(`PASS: ${message}`);
}

function isLocalHost(value) {
  if (!value) return false;
  try {
    const u = new URL(value.includes("://") ? value : `postgresql://${value}`);
    return u.hostname === "127.0.0.1" || u.hostname === "localhost";
  } catch {
    return /127\.0\.0\.1|localhost/i.test(value);
  }
}

function assertLocalOnly() {
  if (!existsSync(CONFIG)) {
    fail(`missing ${CONFIG} — create local supabase/config.toml first`);
  }

  const dangerousEnv = [
    "SUPABASE_DB_URL",
    "DATABASE_URL",
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
  ];
  for (const key of dangerousEnv) {
    const v = process.env[key];
    if (!v) continue;
    const lower = v.toLowerCase();
    if (PROD_PROJECT_HINTS.some((h) => lower.includes(h))) {
      fail(`${key} looks like a remote/production project — refusing db reset`);
    }
    if (key.includes("DB") || key === "DATABASE_URL") {
      if (!isLocalHost(v)) {
        fail(`${key} is not localhost/127.0.0.1 — refusing db reset`);
      }
    }
  }

  if (process.env.SUPABASE_PROJECT_ID || process.env.SUPABASE_PROJECT_REF) {
    const ref = process.env.SUPABASE_PROJECT_ID || process.env.SUPABASE_PROJECT_REF;
    if (PROD_PROJECT_HINTS.some((h) => String(ref).toLowerCase().includes(h))) {
      fail("SUPABASE_PROJECT_ID/REF matches production — refusing db reset");
    }
  }
}

function runReset() {
  assertLocalOnly();

  console.log("Running: npx supabase db reset --yes (local only)");
  const result = spawnSync("npx", ["supabase", "db", "reset", "--yes"], {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
    env: {
      ...process.env,
      // Extra belt: never accidentally follow a linked remote.
      SUPABASE_INTERNAL_NO_LINKED: "1",
    },
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.error) {
    fail(`failed to spawn supabase CLI: ${result.error.message}`);
  }
  if (result.status !== 0) {
    fail(`supabase db reset exited with code ${result.status ?? "unknown"}`);
  }
  pass("supabase db reset --yes completed successfully");
}

runReset();
