#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

function load(key) {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) return null;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line.startsWith(`${key}=`)) continue;
    let v = line.slice(key.length + 1).trim();
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

const cron = load("CRON_SECRET");
const hub = load("ADMIN_HUB_SECRET");
if (!cron || cron.length < 32 || !hub || hub.length < 32) {
  console.error("LOCAL_SECRETS_WEAK");
  process.exit(1);
}

for (const env of ["production", "preview"]) {
  for (const [key, value] of [
    ["CRON_SECRET", cron],
    ["ADMIN_HUB_SECRET", hub],
  ]) {
    // JSON.stringify keeps PowerShell/cmd from mangling the hex value.
    const cmd = `npx vercel env add ${key} ${env} --value ${JSON.stringify(value)} --yes --force --sensitive`;
    const r = spawnSync(cmd, {
      cwd: ROOT,
      encoding: "utf8",
      shell: true,
    });
    const tail = `${r.stderr || ""}\n${r.stdout || ""}`
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(-3)
      .join(" | ");
    console.error(`${key} ${env} status=${r.status} ${tail}`);
    if (r.status !== 0) process.exit(1);
  }
}
console.log("SET_OK");
