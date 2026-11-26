/**
 * Minimal supabase-js query-builder emulation over PGlite, enough for the
 * billing / profile service paths exercised by tests/db-shape. Errors surface
 * as `{ code, message }` with the real Postgres SQLSTATE, like PostgREST.
 *
 * `role: "service_role"` behaves like the admin client; `role: "authenticated"`
 * runs every statement as that user (JWT claims + `set local role`), so RLS,
 * column privileges and triggers apply exactly as for a PostgREST request.
 */
import type { PGlite } from "@electric-sql/pglite";

type Filter = [string, string, unknown];
type PgErr = { code?: string; message: string };
type Result = { data: unknown; error: PgErr | null };

export type ClientIdentity = { role: "service_role" | "authenticated"; uid?: string };
export type CallLog = Array<{ op: string; table: string; error?: string }>;

const ident = (s: string) => `"${s.replace(/"/g, "")}"`;

export function makeFakeSupabaseClient(db: PGlite, who: ClientIdentity, log: CallLog = []) {
  async function exec(sql: string, params: unknown[]) {
    await db.exec("begin");
    try {
      const claims = JSON.stringify(who.uid ? { sub: who.uid, role: who.role, aal: "aal1" } : { role: who.role });
      await db.query(`select set_config('request.jwt.claims', $1, true)`, [claims]);
      await db.exec(`set local role ${who.role}`);
      const r = await db.query<Record<string, unknown>>(sql, params);
      await db.exec("commit");
      return r;
    } catch (e) {
      await db.exec("rollback");
      throw e;
    }
  }

  class Query implements PromiseLike<Result> {
    private filters: Filter[] = [];
    private op: "select" | "insert" | "upsert" | "update" | "delete" = "select";
    private cols = "*";
    private returning = false;
    private rows: Record<string, unknown>[] = [];
    private row: Record<string, unknown> = {};
    private upsertOpts: { onConflict?: string; ignoreDuplicates?: boolean } = {};
    private orderBy = "";
    private limitBy = "";
    private one: "" | "single" | "maybe" = "";
    constructor(private table: string) {}
    select(c?: string) {
      if (this.op === "select") this.cols = c || "*";
      else this.returning = true;
      return this;
    }
    insert(r: Record<string, unknown> | Record<string, unknown>[]) {
      this.op = "insert";
      this.rows = Array.isArray(r) ? r : [r];
      return this;
    }
    upsert(r: Record<string, unknown> | Record<string, unknown>[], o: { onConflict?: string; ignoreDuplicates?: boolean } = {}) {
      this.op = "upsert";
      this.rows = Array.isArray(r) ? r : [r];
      this.upsertOpts = o;
      return this;
    }
    update(r: Record<string, unknown>) {
      this.op = "update";
      this.row = r;
      return this;
    }
    delete() {
      this.op = "delete";
      return this;
    }
    eq(c: string, v: unknown) { this.filters.push([c, "=", v]); return this; }
    neq(c: string, v: unknown) { this.filters.push([c, "<>", v]); return this; }
    lt(c: string, v: unknown) { this.filters.push([c, "<", v]); return this; }
    gte(c: string, v: unknown) { this.filters.push([c, ">=", v]); return this; }
    is(c: string, v: unknown) { this.filters.push([c, "is", v]); return this; }
    in(c: string, v: unknown[]) { this.filters.push([c, "in", v]); return this; }
    order(c: string, o: { ascending?: boolean } = {}) {
      this.orderBy = ` order by ${ident(c)} ${o.ascending === false ? "desc" : "asc"}`;
      return this;
    }
    limit(n: number) { this.limitBy = ` limit ${Number(n)}`; return this; }
    single() { this.one = "single"; return this.run(); }
    maybeSingle() { this.one = "maybe"; return this.run(); }
    then<A = Result, B = never>(a?: ((v: Result) => A | PromiseLike<A>) | null, b?: ((e: unknown) => B | PromiseLike<B>) | null) {
      return this.run().then(a, b);
    }
    private where(p: unknown[]): string {
      if (!this.filters.length) return "";
      return (
        " where " +
        this.filters
          .map(([c, o, v]) => {
            if (o === "is" && v === null) return `${ident(c)} is null`;
            if (o === "in") {
              p.push((v as unknown[]).map(String));
              return `${ident(c)}::text = any($${p.length}::text[])`;
            }
            p.push(v);
            return `${ident(c)} ${o} $${p.length}`;
          })
          .join(" and ")
      );
    }
    private async run(): Promise<Result> {
      const p: unknown[] = [];
      const val = (v: unknown) => {
        p.push(v !== null && typeof v === "object" ? JSON.stringify(v) : v === undefined ? null : v);
        return `$${p.length}`;
      };
      const t = `public.${ident(this.table)}`;
      const ret = this.returning ? ` returning ${this.cols === "*" ? "*" : this.cols}` : "";
      let sql: string;
      if (this.op === "select") sql = `select ${this.cols} from ${t}${this.where(p)}${this.orderBy}${this.limitBy}`;
      else if (this.op === "delete") sql = `delete from ${t}${this.where(p)}${ret}`;
      else if (this.op === "update") {
        const set = Object.entries(this.row).map(([k, v]) => `${ident(k)} = ${val(v)}`).join(", ");
        sql = `update ${t} set ${set}${this.where(p)}${ret}`;
      } else {
        const ks = Object.keys(this.rows[0] ?? {});
        sql = `insert into ${t} (${ks.map(ident).join(", ")}) values ${this.rows
          .map((r) => `(${ks.map((k) => val(r[k])).join(", ")})`)
          .join(", ")}`;
        if (this.op === "upsert") {
          const conflict = (this.upsertOpts.onConflict ?? "id").split(",").map((s) => s.trim());
          const setCols = ks.filter((k) => !conflict.includes(k));
          sql += ` on conflict (${conflict.map(ident).join(", ")}) do ${
            this.upsertOpts.ignoreDuplicates || setCols.length === 0
              ? "nothing"
              : `update set ${setCols.map((k) => `${ident(k)} = excluded.${ident(k)}`).join(", ")}`
          }`;
        }
        sql += ret;
      }
      try {
        const r = await exec(sql, p);
        log.push({ op: this.op, table: this.table });
        if (this.one === "single" && r.rows.length !== 1) {
          return { data: null, error: { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" } };
        }
        if (this.op !== "select" && !this.returning) return { data: null, error: null };
        return { data: this.one ? (r.rows[0] ?? null) : r.rows, error: null };
      } catch (e) {
        const err = e as PgErr;
        log.push({ op: this.op, table: this.table, error: `${err.code} ${err.message}` });
        return { data: null, error: { code: err.code, message: err.message } };
      }
    }
  }

  return {
    from: (table: string) => new Query(table),
    rpc: async (fn: string, args: Record<string, unknown> = {}): Promise<Result> => {
      const ks = Object.keys(args);
      const sql = `select to_jsonb(x) as j from public.${ident(fn)}(${ks
        .map((k, i) => `${ident(k)} => $${i + 1}`)
        .join(", ")}) as x`;
      try {
        const r = await exec(sql, ks.map((k) => {
          const v = args[k];
          return v !== null && typeof v === "object" ? JSON.stringify(v) : v;
        }));
        log.push({ op: "rpc", table: fn });
        // `from fn() as x` + to_jsonb(x): scalar results come back as the value itself.
        return { data: (r.rows[0] as { j?: unknown } | undefined)?.j ?? null, error: null };
      } catch (e) {
        const err = e as PgErr;
        log.push({ op: "rpc", table: fn, error: `${err.code} ${err.message}` });
        return { data: null, error: { code: err.code, message: err.message } };
      }
    },
  };
}

export type FakeSupabaseClient = ReturnType<typeof makeFakeSupabaseClient>;
