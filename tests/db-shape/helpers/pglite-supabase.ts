/**
 * In-process "Supabase-like" Postgres for schema-shape tests (K-011).
 *
 * Boots PGlite (WASM Postgres, no Docker), installs minimal stand-ins for the
 * Supabase platform objects the repo migrations reference (roles, auth.*,
 * storage.*, cron.*, vault.*, net.*), then applies EVERY file in
 * supabase/migrations in lexical order, each in its own transaction, the way
 * `supabase db reset` does.
 *
 * Only `create extension ... pg_cron|pg_net` statements are neutralised (PGlite
 * cannot load those extensions; the cron/net schemas are stubbed instead). No
 * other migration text is rewritten. In particular `comment on extension
 * pg_net` is NOT stripped, so this harness models a project on which pg_net
 * was NOT pre-installed (pg_extension never contains pg_net here).
 *
 * `legacy: true` turns the database into the legacy production shape described
 * in docs/BACKEND_TEST_REPORT.md and migrations 20260704150000 / 20260707190000
 * / 20260707200000: gem_ledger.transaction_type instead of gem_ledger.type, no
 * gem_ledger.metadata, credit/debit enum labels, and the legacy profiles
 * columns full_name / subscription_tier / height / weight / experience.
 */
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

/**
 * The K-011 forward migration (and anything after it) is applied AFTER the
 * legacy conversion: that is how it will land on an already-legacy production
 * database. Everything earlier runs on the repo shape first.
 */
export const K011_LEGACY_BEFORE = "20261126";

export const SHAPES = [
  { name: "migration-only", legacy: false },
  { name: "legacy-production", legacy: true },
] as const;

const PLATFORM_STUB = `
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create role supabase_auth_admin nologin noinherit;
create role authenticator noinherit;
create role supabase_admin nologin;
grant anon, authenticated, service_role to authenticator;
create schema auth; create schema storage; create schema extensions; create schema vault;
create schema cron; create schema net; create schema realtime; create schema graphql_public;
grant usage on schema public, auth, storage, extensions, realtime to anon, authenticated, service_role;
grant all on schema public to service_role, anon, authenticated;
revoke create on schema public from anon, authenticated, public;
grant usage on schema auth, public to supabase_auth_admin;
create table auth.users (
  instance_id uuid, id uuid primary key default gen_random_uuid(), aud text, role text,
  email text unique, encrypted_password text, email_confirmed_at timestamptz, invited_at timestamptz,
  confirmed_at timestamptz, last_sign_in_at timestamptz,
  raw_app_meta_data jsonb default '{}'::jsonb, raw_user_meta_data jsonb default '{}'::jsonb,
  phone text, phone_confirmed_at timestamptz, banned_until timestamptz, deleted_at timestamptz,
  is_anonymous boolean default false, created_at timestamptz default now(), updated_at timestamptz default now()
);
create table auth.identities (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users on delete cascade, provider text, identity_data jsonb, created_at timestamptz default now());
create table auth.sessions (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users on delete cascade, created_at timestamptz default now());
create table auth.mfa_factors (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users on delete cascade, status text);
grant all on all tables in schema auth to supabase_auth_admin, service_role;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim', true), ''), nullif(current_setting('request.jwt.claims', true), ''))::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid $$;
create function auth.role() returns text language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'))::text $$;
create function auth.email() returns text language sql stable as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')::text $$;
grant execute on all functions in schema auth to public;
create table storage.buckets (id text primary key, name text, owner uuid, public boolean default false, avif_autodetection boolean, file_size_limit bigint, allowed_mime_types text[], created_at timestamptz default now(), updated_at timestamptz default now());
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets, name text, owner uuid, owner_id text, metadata jsonb, created_at timestamptz default now(), updated_at timestamptz default now());
alter table storage.objects enable row level security;
alter table storage.buckets enable row level security;
grant all on storage.objects, storage.buckets to anon, authenticated, service_role;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
create function storage.filename(name text) returns text language sql immutable as $$ select (string_to_array(name, '/'))[array_length(string_to_array(name, '/'), 1)] $$;
create function storage.extension(name text) returns text language sql immutable as $$ select reverse(split_part(reverse(name), '.', 1)) $$;
create table cron.job (jobid bigserial primary key, schedule text, command text, jobname text, active boolean default true);
create table cron.job_run_details (jobid bigint, runid bigserial, status text, start_time timestamptz, return_message text);
create function cron.schedule(job_name text, sched text, cmd text) returns bigint language plpgsql as $$
  declare i bigint; begin insert into cron.job(jobname, schedule, command) values (job_name, sched, cmd) returning jobid into i; return i; end $$;
create function cron.unschedule(i bigint) returns boolean language sql as $$ delete from cron.job where jobid = i; select true $$;
create function cron.unschedule(n text) returns boolean language sql as $$ delete from cron.job where jobname = n; select true $$;
create table vault.secrets (id uuid default gen_random_uuid(), name text unique, secret text, description text);
create view vault.decrypted_secrets as select *, secret as decrypted_secret from vault.secrets;
create function net.http_get(url text, params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 1000) returns bigint language sql as $$ select 1::bigint $$;
create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 1000) returns bigint language sql as $$ select 1::bigint $$;
create publication supabase_realtime;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`;

/**
 * Legacy production shape (docs/BACKEND_TEST_REPORT.md:26 + drift migrations).
 * enum additions must commit before use, so they run in their own statements.
 */
const LEGACY_ENUM_LABELS = ["credit", "debit"];
const LEGACY_SHAPE_SQL = `
alter table public.gem_ledger rename column type to transaction_type;
alter table public.gem_ledger drop column if exists metadata;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists subscription_tier public.subscription_tier;
alter table public.profiles add column if not exists height integer;
alter table public.profiles add column if not exists weight numeric;
alter table public.profiles add column if not exists experience text;
`;

export type MigrationResult = { file: string; ok: boolean; error?: string };

export type BootOptions = {
  /** Convert to the legacy production shape. */
  legacy?: boolean;
  /**
   * When legacy is set: apply the legacy conversion right before the first
   * migration whose filename is >= this value (models the forward migration
   * landing on an already-legacy production DB). Default: after all migrations.
   */
  legacyBefore?: string;
  /** Seed the vault cron secret (production has it). Default true. */
  vaultSecret?: boolean;
  /** Runs right after the legacy conversion (e.g. to seed pre-existing legacy rows). */
  afterLegacyConversion?: (db: PGlite) => Promise<void>;
};

export type ShapeDb = { db: PGlite; results: MigrationResult[]; failed: MigrationResult[] };

function neutraliseUnavailableExtensions(sql: string): string {
  return sql.replace(
    /create\s+extension\s+if\s+not\s+exists\s+(pg_cron|pg_net)[^;]*;/gi,
    "/* PGlite: extension $1 stubbed by tests/db-shape harness */",
  );
}

async function resetSession(db: PGlite): Promise<void> {
  await db.exec(`reset role; set search_path = "$user", public, extensions`);
}

export async function applyLegacyShape(db: PGlite): Promise<void> {
  for (const label of LEGACY_ENUM_LABELS) {
    await db.exec(`alter type public.gem_transaction_type add value if not exists '${label}'`);
  }
  await db.exec(LEGACY_SHAPE_SQL);
}

export function listMigrations(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

export async function bootSupabaseLike(options: BootOptions = {}): Promise<ShapeDb> {
  const { legacy = false, legacyBefore, vaultSecret = true, afterLegacyConversion } = options;
  const convert = async () => {
    await applyLegacyShape(db);
    if (afterLegacyConversion) await afterLegacyConversion(db);
    await resetSession(db);
  };
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.waitReady;
  await db.exec(PLATFORM_STUB);
  await db.exec("create extension if not exists pgcrypto with schema extensions;");
  await db.exec(`alter database postgres set search_path = "$user", public, extensions`);
  await resetSession(db);
  if (vaultSecret) {
    await db.exec(`insert into vault.secrets(name, secret) values ('kaify_cron_secret', 'test-only-not-a-secret')`);
  }

  const results: MigrationResult[] = [];
  let legacyApplied = !legacy;
  for (const file of listMigrations()) {
    if (!legacyApplied && legacyBefore && file >= legacyBefore) {
      await convert();
      legacyApplied = true;
    }
    const sql = neutraliseUnavailableExtensions(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
    try {
      await db.exec(`begin;\n${sql}\n;commit;`);
      results.push({ file, ok: true });
    } catch (e) {
      try {
        await db.exec("rollback");
      } catch {
        /* no open transaction */
      }
      const err = e as { message?: string; where?: string };
      results.push({ file, ok: false, error: `${err.message ?? String(e)}${err.where ? ` @ ${err.where}` : ""}` });
    }
    await resetSession(db);
  }
  if (!legacyApplied) await convert();
  await resetSession(db);
  return { db, results, failed: results.filter((r) => !r.ok) };
}

/** Run fn as a given role/uid inside a transaction (committed unless rollback). */
export async function asRole<T>(
  db: PGlite,
  role: "authenticated" | "service_role" | "anon",
  uid: string | null,
  fn: () => Promise<T>,
  opts: { commit?: boolean } = {},
): Promise<T> {
  await db.exec("begin");
  try {
    const claims = JSON.stringify(uid ? { sub: uid, role, aal: "aal1" } : { role });
    await db.query(`select set_config('request.jwt.claims', $1, true)`, [claims]);
    await db.exec(`set local role ${role}`);
    const r = await fn();
    await db.exec(opts.commit === false ? "rollback" : "commit");
    return r;
  } catch (e) {
    await db.exec("rollback");
    throw e;
  }
}

export async function createAuthUser(db: PGlite, id: string, email: string): Promise<void> {
  await db.query("insert into auth.users(id, email) values ($1, $2)", [id, email]);
}

export async function hasColumn(db: PGlite, table: string, column: string): Promise<boolean> {
  const r = await db.query<{ e: boolean }>(
    `select exists (select 1 from information_schema.columns
       where table_schema = 'public' and table_name = $1 and column_name = $2) as e`,
    [table, column],
  );
  return r.rows[0]?.e === true;
}
