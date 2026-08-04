#!/usr/bin/env node
import { readFileSync, existsSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const pull = join(ROOT, ".env.vercel.prod.tmp");

function load(path, key) {
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

spawnSync(
  "npx",
  ["vercel", "env", "pull", pull, "--environment=production", "--yes"],
  { cwd: ROOT, encoding: "utf8", shell: true }
);

const keys = [
  "CRON_SECRET",
  "CSRF_SECRET",
  "ADMIN_HUB_PASSWORD",
  "ADMIN_HUB_SECRET",
];
const vals = keys.map((k) => load(pull, k));
const hashes = vals.map((v) =>
  v ? createHash("sha256").update(v).digest("hex").slice(0, 12) : "MISSING"
);
const allSame =
  vals.every((v) => v && vals[0] && v === vals[0]) && vals[0] != null;

console.log(
  JSON.stringify({
    lens: vals.map((v) => v?.length ?? 0),
    hashes,
    all_identical: allSame,
    looks_redacted: allSame && vals[0]?.length === 11,
  })
);

try {
  unlinkSync(pull);
} catch {
  /* */
}
