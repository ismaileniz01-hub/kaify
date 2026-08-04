#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";

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

function h(s) {
  return s
    ? createHash("sha256").update(s).digest("hex").slice(0, 12)
    : "MISSING";
}

const local = load(".env.local", "CRON_SECRET");
const prod = load(".env.vercel.prod.tmp", "CRON_SECRET");
console.log(
  `local_len=${local ? local.length : 0} prod_len=${prod ? prod.length : 0} same=${Boolean(local && prod && local === prod)} local_h=${h(local)} prod_h=${h(prod)}`
);

for (const k of [
  "ADMIN_HUB_SECRET",
  "ADMIN_EMAIL",
  "CSRF_SECRET",
  "ADMIN_HUB_PASSWORD",
]) {
  const p = load(".env.vercel.prod.tmp", k);
  console.log(`${k}_prod=${p ? `SET len=${p.length}` : "MISSING"}`);
}
