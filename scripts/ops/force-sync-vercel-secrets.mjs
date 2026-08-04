#!/usr/bin/env node
import {
  readFileSync,
  writeFileSync,
  existsSync,
  unlinkSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

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

function upsertLocal(key, value) {
  const path = join(ROOT, ".env.local");
  let text = existsSync(path) ? readFileSync(path, "utf8") : "";
  const re = new RegExp(`^${key}=.*$`, "m");
  const line = `${key}=${value}`;
  if (re.test(text)) text = text.replace(re, line);
  else text = `${text.trimEnd()}\n${line}\n`;
  writeFileSync(path, text, "utf8");
}

function vercelSet(name, environment, value) {
  const r = spawnSync(
    "npx",
    [
      "vercel",
      "env",
      "add",
      name,
      environment,
      "--value",
      value,
      "--yes",
      "--force",
      "--sensitive",
    ],
    { cwd: ROOT, encoding: "utf8", shell: true }
  );
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout || `failed ${name} ${environment}`);
    process.exit(1);
  }
  console.error(`set ${name} ${environment} len=${value.length}`);
}

const mode = process.argv[2] || "status";

if (mode === "status") {
  const cron = load(join(ROOT, ".env.local"), "CRON_SECRET");
  console.log(
    JSON.stringify({
      cron_len: cron?.length ?? 0,
      cron_h: cron
        ? createHash("sha256").update(cron).digest("hex").slice(0, 12)
        : "MISSING",
      hub: load(join(ROOT, ".env.local"), "ADMIN_HUB_SECRET")
        ? "SET"
        : "MISSING",
    })
  );
  process.exit(0);
}

if (mode === "force-sync") {
  let cron = load(join(ROOT, ".env.local"), "CRON_SECRET");
  if (!cron || cron.length < 32) {
    cron = process.env.RESTORE_CRON?.trim() || null;
  }
  if (!cron || cron.length < 32) {
    cron = randomBytes(32).toString("hex");
    console.error("generated new CRON_SECRET");
  }
  let hub = load(join(ROOT, ".env.local"), "ADMIN_HUB_SECRET");
  if (!hub || hub.length < 32) {
    hub = process.env.RESTORE_HUB?.trim() || randomBytes(32).toString("hex");
    console.error("using/generated ADMIN_HUB_SECRET");
  }

  upsertLocal("CRON_SECRET", cron);
  upsertLocal("ADMIN_HUB_SECRET", hub);

  for (const env of ["production", "preview"]) {
    vercelSet("CRON_SECRET", env, cron);
    vercelSet("ADMIN_HUB_SECRET", env, hub);
  }

  // vercel env pull redacts Sensitive values to identical 11-char stubs — cannot verify by pull.
  console.log(
    JSON.stringify({
      ok: true,
      note: "set via --value --force; pull is redacted for Sensitive vars",
      cron_h: createHash("sha256").update(cron).digest("hex").slice(0, 12),
      hub_len: hub.length,
    })
  );
  process.exit(0);
}

console.error(`unknown mode: ${mode}`);
process.exit(1);
