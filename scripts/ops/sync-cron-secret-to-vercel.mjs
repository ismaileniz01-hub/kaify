#!/usr/bin/env node
/**
 * Sync CRON_SECRET from .env.local → Vercel (production + preview).
 * Optionally generate ADMIN_HUB_SECRET when missing on prod pull file.
 *
 * Never prints secret values.
 *
 * Usage:
 *   node scripts/ops/sync-cron-secret-to-vercel.mjs
 *   node scripts/ops/sync-cron-secret-to-vercel.mjs --with-hub-secret
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

function loadEnv(path, key) {
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

function vercelEnvRm(name, environment) {
  const r = spawnSync(
    "npx",
    ["vercel", "env", "rm", name, environment, "--yes"],
    { cwd: ROOT, encoding: "utf8", shell: true }
  );
  // ignore missing
  return r.status === 0;
}

function vercelEnvAdd(name, environment, value) {
  const r = spawnSync(
    "npx",
    ["vercel", "env", "add", name, environment],
    {
      cwd: ROOT,
      encoding: "utf8",
      shell: true,
      input: value + "\n",
    }
  );
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout || `failed to add ${name} ${environment}`);
    process.exit(1);
  }
}

function upsert(name, environments, value) {
  for (const env of environments) {
    vercelEnvRm(name, env);
    vercelEnvAdd(name, env, value);
    console.error(`upserted ${name} → ${env} (len=${value.length})`);
  }
}

const cron = loadEnv(join(ROOT, ".env.local"), "CRON_SECRET");
if (!cron || cron.length < 32 || cron.includes("your_")) {
  console.error("Refusing: .env.local CRON_SECRET missing/weak/placeholder");
  process.exit(1);
}

upsert("CRON_SECRET", ["production", "preview"], cron);

// Also write vault seed for MCP / SQL editor
const seed = `-- generated; delete after apply
do $$
declare
  sid uuid;
begin
  select id into sid from vault.secrets where name = 'kaify_cron_secret' limit 1;
  if sid is not null then
    perform vault.delete_secret(sid);
  end if;
end $$;

select vault.create_secret(
  '${cron.replace(/'/g, "''")}',
  'kaify_cron_secret',
  'Vercel CRON_SECRET for pg_cron → /api/cron/*'
);
`;
const seedPath = join(tmpdir(), "kaify-vault-cron-seed.sql");
writeFileSync(seedPath, seed, "utf8");
console.error(`vault seed written to ${seedPath}`);

if (process.argv.includes("--with-hub-secret")) {
  const existing = loadEnv(join(ROOT, ".env.vercel.prod.tmp"), "ADMIN_HUB_SECRET");
  if (existing && existing.length >= 32) {
    console.error("ADMIN_HUB_SECRET already strong on prod pull — skip");
  } else {
    const hub = randomBytes(32).toString("hex");
    upsert("ADMIN_HUB_SECRET", ["production", "preview"], hub);
  }
}

console.log("SYNC_OK");
