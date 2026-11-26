/**
 * K-011 (c): the full migration chain must apply on a fresh project where
 * pg_net was NOT pre-installed (supabase db reset / staging / CI restore), and
 * the forward schema-drift fix must apply on an already-legacy database and
 * be re-runnable.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  K011_LEGACY_BEFORE,
  MIGRATIONS_DIR,
  bootSupabaseLike,
  listMigrations,
  type ShapeDb,
} from "./helpers/pglite-supabase";

const opened: ShapeDb[] = [];
afterAll(async () => {
  await Promise.all(opened.map((s) => s.db.close()));
});

describe("migration chain (K-011)", () => {
  it(
    "applies every migration on a fresh database without pg_net pre-installed",
    async () => {
      const s = await bootSupabaseLike();
      opened.push(s);
      const pgNet = await s.db.query<{ n: number }>(
        "select count(*)::int as n from pg_extension where extname = 'pg_net'",
      );
      expect(pgNet.rows[0]?.n).toBe(0);
      expect(s.failed).toEqual([]);
      expect(s.results.length).toBe(listMigrations().length);
    },
    60_000,
  );

  it(
    "applies the forward drift fix on a legacy-shaped database and re-runs idempotently",
    async () => {
      const forward = listMigrations().filter((f) => f >= K011_LEGACY_BEFORE);
      expect(forward.length, "K-011 forward migration is missing").toBeGreaterThan(0);

      const s = await bootSupabaseLike({ legacy: true, legacyBefore: K011_LEGACY_BEFORE });
      opened.push(s);
      expect(s.failed).toEqual([]);

      for (const file of forward) {
        const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
        await s.db.exec(`begin;\n${sql}\n;commit;`);
      }
    },
    60_000,
  );
});
