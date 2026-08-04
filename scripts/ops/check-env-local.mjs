#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const envPath = join(ROOT, ".env.local");
console.log(
  JSON.stringify({
    root: ROOT,
    env_exists: existsSync(envPath),
    has_cron: existsSync(envPath)
      ? /^CRON_SECRET=/m.test(readFileSync(envPath, "utf8"))
      : false,
  })
);
