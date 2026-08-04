#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";

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

for (const k of [
  "CRON_SECRET",
  "CSRF_SECRET",
  "ADMIN_HUB_PASSWORD",
  "ADMIN_HUB_SECRET",
]) {
  const v = load(".env.vercel.prod.tmp", k);
  if (!v) {
    console.log(`${k}: MISSING`);
    continue;
  }
  console.log(
    `${k}: len=${v.length} has_your_=${v.includes("your_")} looks_placeholder=${/^(change|replace|todo|xxx|password|secret)/i.test(v) || v.includes("your_")}`
  );
}
