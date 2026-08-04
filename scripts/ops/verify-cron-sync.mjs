#!/usr/bin/env node
import { readFileSync, existsSync, unlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const pullPath = join(ROOT, ".env.vercel.prod.tmp");

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
  ["vercel", "env", "pull", pullPath, "--environment=production", "--yes"],
  { cwd: ROOT, encoding: "utf8", shell: true }
);

const local = load(join(ROOT, ".env.local"), "CRON_SECRET");
const prod = load(pullPath, "CRON_SECRET");
const hub = load(pullPath, "ADMIN_HUB_SECRET");

const h = (s) =>
  s ? createHash("sha256").update(s).digest("hex").slice(0, 12) : "MISSING";

console.log(
  JSON.stringify({
    local_len: local?.length ?? 0,
    prod_len: prod?.length ?? 0,
    same: Boolean(local && prod && local === prod),
    local_h: h(local),
    prod_h: h(prod),
    local_has_nl: local ? /[\r\n]/.test(local) : null,
    prod_has_nl: prod ? /[\r\n]/.test(prod) : null,
    hub_len: hub?.length ?? 0,
  })
);

try {
  unlinkSync(pullPath);
} catch {
  /* ignore */
}
