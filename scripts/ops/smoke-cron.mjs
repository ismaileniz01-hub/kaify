#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

function loadCronSecret() {
  if (process.env.CRON_SECRET?.trim()) return process.env.CRON_SECRET.trim();
  const envPath = join(ROOT, ".env.local");
  if (!existsSync(envPath)) return null;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (!line.startsWith("CRON_SECRET=")) continue;
    let v = line.slice("CRON_SECRET=".length).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    return v || null;
  }
  return null;
}

const secret = loadCronSecret();
if (!secret) {
  console.error("CRON_SECRET missing");
  process.exit(1);
}

const url =
  process.argv[2] || "https://kaifyai.org/api/cron/leaderboard-snapshot";

const res = await fetch(url, {
  headers: { Authorization: `Bearer ${secret}` },
});
const body = (await res.text()).slice(0, 160).replace(/\s+/g, " ");
console.log(`status=${res.status} body=${body}`);
process.exit(res.ok ? 0 : 1);
