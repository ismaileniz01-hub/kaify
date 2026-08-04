#!/usr/bin/env node
/**
 * Apply frequent pg_cron schedules (Faz 1 / ADR 009).
 *
 * Reads CRON_SECRET from env or .env.local — never prints the secret.
 *
 * Usage:
 *   node scripts/ops/apply-pg-cron.mjs              # print redacted plaintext-bearer SQL
 *   node scripts/ops/apply-pg-cron.mjs --write-tmp   # write full bearer SQL to OS temp
 *   node scripts/ops/apply-pg-cron.mjs --seed-vault  # write vault.create_secret SQL to OS temp
 *   node scripts/ops/apply-pg-cron.mjs --vault-sql   # print vault-backed schedule SQL (no secret)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const TEMPLATE = join(ROOT, "docs/operations/pg-cron-frequent-schedules.sql");
const VAULT_TEMPLATE = join(
  ROOT,
  "docs/operations/pg-cron-frequent-schedules-vault.sql"
);
const APP_URL = process.env.APP_BASE_URL?.trim() || "https://kaifyai.org";

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

function sqlLiteral(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

if (process.argv.includes("--vault-sql")) {
  console.log(readFileSync(VAULT_TEMPLATE, "utf8"));
  process.exit(0);
}

const secret = loadCronSecret();
if (!secret) {
  console.error("CRON_SECRET missing (env or .env.local)");
  process.exit(1);
}

if (process.argv.includes("--seed-vault")) {
  // Prefer update when id known; create otherwise. delete_secret may be unavailable.
  const sql = `-- generated; delete after use
do $$
declare
  sid uuid;
begin
  select id into sid from vault.secrets where name = 'kaify_cron_secret' limit 1;
  if sid is not null then
    perform vault.update_secret(
      sid,
      ${sqlLiteral(secret)},
      'kaify_cron_secret',
      'Vercel CRON_SECRET for pg_cron → /api/cron/*'
    );
  else
    perform vault.create_secret(
      ${sqlLiteral(secret)},
      'kaify_cron_secret',
      'Vercel CRON_SECRET for pg_cron → /api/cron/*'
    );
  end if;
end $$;
`;
  const out = join(tmpdir(), "kaify-vault-cron-seed.sql");
  writeFileSync(out, sql, "utf8");
  console.error(`Wrote vault seed SQL to ${out} (contains secret — delete after use)`);
  console.log("SEED_OK");
  process.exit(0);
}

let sql = readFileSync(TEMPLATE, "utf8");
sql = sql.replaceAll("__APP_BASE_URL__", APP_URL);
sql = sql.replaceAll("__CRON_SECRET__", secret);

const retireLegacy = `
do $$
declare
  j record;
begin
  for j in
    select jobid from cron.job where jobname = 'kaify-notifications'
  loop
    perform cron.unschedule(j.jobid);
  end loop;
exception when others then
  raise notice 'legacy unschedule skipped: %', sqlerrm;
end $$;
`;

sql = retireLegacy + "\n" + sql;

const redacted = sql.replaceAll(secret, "***REDACTED***");
console.log(redacted);

if (process.argv.includes("--write-tmp")) {
  const out = join(tmpdir(), "kaify-pg-cron-apply.sql");
  writeFileSync(out, sql, "utf8");
  console.error(`Wrote apply SQL to ${out} (contains secret — delete after use)`);
}
