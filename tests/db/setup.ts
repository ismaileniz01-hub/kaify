/**
 * Live database test helpers for local/CI Supabase.
 * Skip when KAIFY_DB_TESTS !== "1" (handled by individual suites).
 */
import { spawnSync } from "node:child_process";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export type DbEnv = {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
  dbUrl: string | null;
};

export type TestUser = {
  label: "USER_A" | "USER_B";
  user: User;
  password: string;
  email: string;
  client: SupabaseClient;
};

export type AccessAssertionCtx = {
  table: string;
  op: "select" | "insert" | "update" | "delete" | "rpc";
  actor: string;
  owner?: string;
  expected: "allowed" | "denied";
  actual: "allowed" | "denied";
  detail?: string;
  error?: string | null;
};

let cachedEnv: DbEnv | null = null;

function parseEnvOutput(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2] ?? "";
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[m[1]!] = v;
  }
  return out;
}

/** Prefer process.env; fall back to `supabase status -o env` when local stack is up. */
export function loadDbEnv(): DbEnv {
  if (cachedEnv) return cachedEnv;

  let fromStatus: Record<string, string> = {};
  try {
    const result = spawnSync("npx", ["supabase", "status", "-o", "env"], {
      encoding: "utf8",
      shell: true,
      timeout: 30_000,
    });
    if (result.status === 0 && result.stdout) {
      fromStatus = parseEnvOutput(result.stdout);
    }
  } catch {
    // Local stack unavailable — env vars must be provided explicitly.
  }

  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    fromStatus.API_URL ||
    fromStatus.SUPABASE_URL ||
    "http://127.0.0.1:54321";

  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    fromStatus.ANON_KEY ||
    fromStatus.SUPABASE_ANON_KEY ||
    "";

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    fromStatus.SERVICE_ROLE_KEY ||
    fromStatus.SUPABASE_SERVICE_ROLE_KEY ||
    "";

  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    fromStatus.DB_URL ||
    fromStatus.POSTGRES_URL ||
    null;

  if (!anonKey || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY (set env or run `supabase start`)",
    );
  }

  cachedEnv = { url, anonKey, serviceRoleKey, dbUrl };
  return cachedEnv;
}

export function createServiceClient(): SupabaseClient {
  const env = loadDbEnv();
  return createClient(env.url, env.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function createAnonClient(): SupabaseClient {
  const env = loadDbEnv();
  return createClient(env.url, env.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function createAuthenticatedClient(
  email: string,
  password: string,
): Promise<SupabaseClient> {
  const env = loadDbEnv();
  const client = createClient(env.url, env.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`signIn failed for ${email}: ${error?.message ?? "no session"}`);
  }
  return client;
}

function randomSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function createTestUser(
  label: "USER_A" | "USER_B",
  admin: SupabaseClient = createServiceClient(),
): Promise<TestUser> {
  const email = `dbtest-${label.toLowerCase()}-${randomSuffix()}@example.com`;
  const password = `DbTest-${randomSuffix()}!Aa1`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: label },
  });
  if (error || !data.user) {
    throw new Error(`createUser ${label} failed: ${error?.message ?? "no user"}`);
  }

  const client = await createAuthenticatedClient(email, password);
  return { label, user: data.user, password, email, client };
}

export async function deleteTestUser(
  userId: string,
  admin: SupabaseClient = createServiceClient(),
): Promise<void> {
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    // Best-effort cleanup; surface but do not throw if already gone.
    console.warn(`deleteUser ${userId}: ${error.message}`);
  }
}

export async function cleanupTestUsers(users: Array<TestUser | null | undefined>): Promise<void> {
  const admin = createServiceClient();
  for (const u of users) {
    if (u?.user?.id) await deleteTestUser(u.user.id, admin);
  }
}

function formatAccessFailure(ctx: AccessAssertionCtx): string {
  return [
    "RLS/RPC access assertion failed",
    `  table/rpc : ${ctx.table}`,
    `  op        : ${ctx.op}`,
    `  actor     : ${ctx.actor}`,
    `  owner     : ${ctx.owner ?? "(n/a)"}`,
    `  expected  : ${ctx.expected}`,
    `  actual    : ${ctx.actual}`,
    ctx.detail ? `  detail    : ${ctx.detail}` : null,
    ctx.error ? `  error     : ${ctx.error}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function assertAllowed(ctx: Omit<AccessAssertionCtx, "expected" | "actual"> & { ok: boolean }): void {
  const actual = ctx.ok ? "allowed" : "denied";
  if (actual !== "allowed") {
    throw new Error(
      formatAccessFailure({
        ...ctx,
        expected: "allowed",
        actual,
      }),
    );
  }
}

export function assertDenied(ctx: Omit<AccessAssertionCtx, "expected" | "actual"> & { ok: boolean }): void {
  const actual = ctx.ok ? "allowed" : "denied";
  if (actual !== "denied") {
    throw new Error(
      formatAccessFailure({
        ...ctx,
        expected: "denied",
        actual,
      }),
    );
  }
}

/**
 * Run SQL against the local DB via `supabase db query` (JSON) or `psql`.
 * Used for information_schema / pg_proc inventory — not for app traffic.
 */
export function runSqlJson<T = Record<string, unknown>>(sql: string): T[] {
  const env = loadDbEnv();

  const queryAttempt = spawnSync(
    "npx",
    ["supabase", "db", "query", "--output", "json", sql],
    { encoding: "utf8", shell: true, timeout: 60_000 },
  );
  if (queryAttempt.status === 0 && queryAttempt.stdout?.trim()) {
    try {
      const parsed = JSON.parse(queryAttempt.stdout.trim());
      if (Array.isArray(parsed)) return parsed as T[];
      if (parsed && Array.isArray(parsed.rows)) return parsed.rows as T[];
      if (parsed && Array.isArray(parsed.result)) return parsed.result as T[];
    } catch {
      // fall through
    }
  }

  if (!env.dbUrl) {
    throw new Error(
      `SQL query failed and DATABASE_URL unavailable.\nstdout: ${queryAttempt.stdout}\nstderr: ${queryAttempt.stderr}`,
    );
  }

  const psql = spawnSync(
    "psql",
    [env.dbUrl, "-v", "ON_ERROR_STOP=1", "-t", "-A", "-F", "\t", "-c", sql],
    { encoding: "utf8", shell: true, timeout: 60_000 },
  );
  if (psql.status !== 0) {
    throw new Error(
      `psql failed (code ${psql.status}): ${psql.stderr || psql.stdout || queryAttempt.stderr}`,
    );
  }

  // For SELECT ... AS json_agg / row_to_json callers should wrap themselves.
  const lines = (psql.stdout || "").trim();
  if (!lines) return [];
  try {
    const parsed = JSON.parse(lines);
    return (Array.isArray(parsed) ? parsed : [parsed]) as T[];
  } catch {
    return lines.split(/\r?\n/).map((line) => {
      const [a, b] = line.split("\t");
      return { name: a, value: b } as T;
    });
  }
}

/** List public base tables via information_schema. */
export function listPublicBaseTables(): string[] {
  const rows = runSqlJson<{ table_name: string }>(
    `select table_name
     from information_schema.tables
     where table_schema = 'public' and table_type = 'BASE TABLE'
     order by table_name;`,
  );
  return [...new Set(rows.map((r) => r.table_name).filter(Boolean))];
}

/** List public SECURITY DEFINER routine names via pg_proc. */
export function listSecurityDefinerFunctions(): string[] {
  const rows = runSqlJson<{ proname: string }>(
    `select proname
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prosecdef = true
     order by proname;`,
  );
  return [...new Set(rows.map((r) => r.proname).filter(Boolean))];
}

export function dbTestsEnabled(): boolean {
  return process.env.KAIFY_DB_TESTS === "1";
}
