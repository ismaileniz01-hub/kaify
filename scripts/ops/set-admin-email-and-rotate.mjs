#!/usr/bin/env node
/**
 * Set ADMIN_EMAIL + rotate weak CSRF / ADMIN_HUB_PASSWORD on Vercel + .env.local.
 * Never prints secret values.
 *
 * Usage: node scripts/ops/set-admin-email-and-rotate.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const ADMIN_EMAIL = "ismaileniz01@gmail.com";

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

function upsertLocal(key, value) {
  const path = join(ROOT, ".env.local");
  let text = existsSync(path) ? readFileSync(path, "utf8") : "";
  const re = new RegExp(`^${key}=.*$`, "m");
  const line = `${key}=${value}`;
  if (re.test(text)) text = text.replace(re, line);
  else text = `${text.trimEnd()}\n${line}\n`;
  writeFileSync(path, text, "utf8");
}

function vercelSet(name, environments, value, { sensitive }) {
  for (const env of environments) {
    const sens = sensitive ? " --sensitive" : " --no-sensitive";
    const cmd = `npx vercel env add ${name} ${env} --value ${JSON.stringify(value)} --yes --force${sens}`;
    const r = spawnSync(cmd, { cwd: ROOT, encoding: "utf8", shell: true });
    if (r.status !== 0) {
      console.error(r.stderr || r.stdout || `failed ${name} ${env}`);
      process.exit(1);
    }
    console.error(
      `ok ${name} → ${env} (len=${value.length}, sensitive=${sensitive})`
    );
  }
}

upsertLocal("ADMIN_EMAIL", ADMIN_EMAIL);
vercelSet("ADMIN_EMAIL", ["production", "preview"], ADMIN_EMAIL, {
  sensitive: false,
});

let csrf = load("CSRF_SECRET");
if (!csrf || csrf.length < 32 || csrf.includes("your_")) {
  csrf = randomBytes(32).toString("hex");
  console.error("rotated CSRF_SECRET (new strong value)");
}
upsertLocal("CSRF_SECRET", csrf);
vercelSet("CSRF_SECRET", ["production", "preview"], csrf, { sensitive: true });

let hubPw = load("ADMIN_HUB_PASSWORD");
if (!hubPw || hubPw.length < 24 || hubPw.includes("your_")) {
  hubPw = randomBytes(24).toString("base64url");
  console.error("rotated ADMIN_HUB_PASSWORD (new strong value)");
}
upsertLocal("ADMIN_HUB_PASSWORD", hubPw);
vercelSet("ADMIN_HUB_PASSWORD", ["production", "preview"], hubPw, {
  sensitive: true,
});

let hubSecret = load("ADMIN_HUB_SECRET");
if (!hubSecret || hubSecret.length < 32) {
  hubSecret = randomBytes(32).toString("hex");
  console.error("rotated ADMIN_HUB_SECRET (was weak/missing)");
  upsertLocal("ADMIN_HUB_SECRET", hubSecret);
  vercelSet("ADMIN_HUB_SECRET", ["production", "preview"], hubSecret, {
    sensitive: true,
  });
}

console.log(
  JSON.stringify({
    ok: true,
    admin_email: ADMIN_EMAIL,
    csrf_len: csrf.length,
    hub_password_len: hubPw.length,
    hub_secret_len: (load("ADMIN_HUB_SECRET") || "").length,
  })
);
