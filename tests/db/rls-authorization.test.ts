/**
 * Live RLS authorization tests (USER_A vs USER_B).
 * Skipped unless KAIFY_DB_TESTS=1 (normal vitest stays green without a DB).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entriesByMode, SCHEMA_REGISTRY, registryTableNames } from "./schema-registry";
import { seedUserOwnedRows } from "./seed";
import {
  assertAllowed,
  assertDenied,
  cleanupTestUsers,
  createServiceClient,
  createTestUser,
  dbTestsEnabled,
  listPublicBaseTables,
  runSqlJson,
  type TestUser,
} from "./setup";
import type { SupabaseClient } from "@supabase/supabase-js";

const enabled = dbTestsEnabled();

describe.skipIf(!enabled)("rls-authorization (live)", () => {
  let admin: SupabaseClient;
  let userA: TestUser;
  let userB: TestUser;

  beforeAll(async () => {
    admin = createServiceClient();
    userA = await createTestUser("USER_A", admin);
    userB = await createTestUser("USER_B", admin);
    await seedUserOwnedRows(admin, userA, userB);
  }, 120_000);

  afterAll(async () => {
    await cleanupTestUsers([userA, userB]);
  }, 60_000);

  it("registry covers every public base table (completeness)", () => {
    const live = listPublicBaseTables().sort();
    const registered = registryTableNames();
    const missing = live.filter((t) => !registered.includes(t));
    const extra = registered.filter((t) => !live.includes(t));
    expect(
      missing,
      `Unregistered public tables (add to schema-registry.ts):\n${missing.join("\n")}`,
    ).toEqual([]);
    expect(
      extra,
      `Registry entries missing from DB (remove or fix):\n${extra.join("\n")}`,
    ).toEqual([]);
  });

  describe("user_own tables", () => {
    const tables = entriesByMode("user_own");

    for (const entry of tables) {
      const ownerCol = entry.ownerColumn ?? "user_id";

      it(`${entry.table}: A reads A allowed; A reads B denied; A update/delete B denied`, async () => {
        const ownerA = userA.user.id;
        const ownerB = userB.user.id;

        const selectA = await userA.client
          .from(entry.table)
          .select("*")
          .eq(ownerCol, ownerA)
          .limit(5);
        assertAllowed({
          table: entry.table,
          op: "select",
          actor: "USER_A",
          owner: ownerA,
          ok: !selectA.error && (selectA.data?.length ?? 0) > 0,
          detail: `rows=${selectA.data?.length ?? 0}`,
          error: selectA.error?.message,
        });

        const selectB = await userA.client
          .from(entry.table)
          .select("*")
          .eq(ownerCol, ownerB)
          .limit(5);
        const leaked = (selectB.data?.length ?? 0) > 0;
        assertDenied({
          table: entry.table,
          op: "select",
          actor: "USER_A",
          owner: ownerB,
          ok: !selectB.error && leaked,
          detail: `rows=${selectB.data?.length ?? 0} (must be 0)`,
          error: selectB.error?.message,
        });

        const updateB = await userA.client
          .from(entry.table)
          .update(harmlessUpdatePatch(entry.table))
          .eq(ownerCol, ownerB)
          .select("*");
        const updated = (updateB.data?.length ?? 0) > 0;
        assertDenied({
          table: entry.table,
          op: "update",
          actor: "USER_A",
          owner: ownerB,
          ok: !updateB.error && updated,
          detail: `updatedRows=${updateB.data?.length ?? 0}`,
          error: updateB.error?.message,
        });

        const deleteB = await userA.client
          .from(entry.table)
          .delete()
          .eq(ownerCol, ownerB)
          .select("*");
        const deleted = (deleteB.data?.length ?? 0) > 0;
        assertDenied({
          table: entry.table,
          op: "delete",
          actor: "USER_A",
          owner: ownerB,
          ok: !deleteB.error && deleted,
          detail: `deletedRows=${deleteB.data?.length ?? 0}`,
          error: deleteB.error?.message,
        });
      });
    }
  });

  describe("service_only tables", () => {
    for (const entry of entriesByMode("service_only")) {
      it(`${entry.table}: authenticated cannot read/write`, async () => {
        const select = await userA.client.from(entry.table).select("*").limit(5);
        const leaked = (select.data?.length ?? 0) > 0;
        assertDenied({
          table: entry.table,
          op: "select",
          actor: "USER_A",
          ok: !select.error && leaked,
          detail: `rows=${select.data?.length ?? 0}`,
          error: select.error?.message,
        });

        const insert = await userA.client.from(entry.table).insert({}).select("*");
        assertDenied({
          table: entry.table,
          op: "insert",
          actor: "USER_A",
          ok: !insert.error && (insert.data?.length ?? 0) > 0,
          error: insert.error?.message,
        });

        const update = await userA.client
          .from(entry.table)
          .update({ updated_at: new Date().toISOString() })
          .neq("created_at", "1970-01-01")
          .select("*");
        assertDenied({
          table: entry.table,
          op: "update",
          actor: "USER_A",
          ok: !update.error && (update.data?.length ?? 0) > 0,
          error: update.error?.message,
        });

        const del = await userA.client
          .from(entry.table)
          .delete()
          .neq("created_at", "1970-01-01")
          .select("*");
        assertDenied({
          table: entry.table,
          op: "delete",
          actor: "USER_A",
          ok: !del.error && (del.data?.length ?? 0) > 0,
          error: del.error?.message,
        });
      });
    }
  });

  describe("authenticated_read tables", () => {
    for (const entry of entriesByMode("authenticated_read")) {
      it(`${entry.table}: authenticated can select; write denied`, async () => {
        const select = await userA.client.from(entry.table).select("*").limit(5);
        assertAllowed({
          table: entry.table,
          op: "select",
          actor: "USER_A",
          ok: !select.error,
          detail: `rows=${select.data?.length ?? 0}`,
          error: select.error?.message,
        });

        const insert = await userA.client.from(entry.table).insert({}).select("*");
        assertDenied({
          table: entry.table,
          op: "insert",
          actor: "USER_A",
          ok: !insert.error && (insert.data?.length ?? 0) > 0,
          error: insert.error?.message,
        });
      });
    }
  });

  it("documents skip_reason entries", () => {
    for (const entry of entriesByMode("skip_reason")) {
      expect(entry.skipReason, entry.table).toBeTruthy();
    }
    expect(SCHEMA_REGISTRY.length).toBeGreaterThan(30);
  });

  it("avatars bucket is private with no public-read policy (SEC-012)", () => {
    const buckets = runSqlJson<{ id: string; is_public: boolean }>(`
      select id, (public)::boolean as is_public
      from storage.buckets
      where id = 'avatars'
    `);
    expect(buckets.length).toBe(1);
    expect(buckets[0]?.is_public).toBe(false);

    const publicRead = runSqlJson<{ polname: string }>(`
      select policyname as polname
      from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname = 'avatars_public_read'
    `);
    expect(publicRead).toEqual([]);

    const ownWrites = runSqlJson<{ polname: string }>(`
      select policyname as polname
      from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname in ('avatars_upload_own', 'avatars_update_own', 'avatars_delete_own')
      order by policyname
    `);
    expect(ownWrites.map((r) => r.polname).sort()).toEqual([
      "avatars_delete_own",
      "avatars_update_own",
      "avatars_upload_own",
    ]);
  });
});

function harmlessUpdatePatch(table: string): Record<string, unknown> {
  switch (table) {
    case "profiles":
      return { bio: "rls-probe" };
    case "user_settings":
      return { sound_effects: false };
    case "support_tickets":
      return { subject: "rls-probe" };
    case "notifications":
      return { read: true };
    case "user_streaks":
      return { current_streak: 999 };
    case "user_kai_state":
      return { active_aura: "hacked" };
    case "analytics_daily":
      return { steps: 999999 };
    case "health_steps":
      return { steps: 999999 };
    default:
      return { updated_at: new Date().toISOString() };
  }
}
