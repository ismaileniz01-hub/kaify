/**
 * K-011 (a)/(b): gem-spending and gem-granting RPCs must work on BOTH ledger
 * shapes, because production's real shape is unknown:
 *   - migration-only: gem_ledger.type + metadata, enum without credit/debit
 *   - legacy production: gem_ledger.transaction_type, no metadata, credit/debit
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  K011_LEGACY_BEFORE,
  SHAPES,
  asRole,
  bootSupabaseLike,
  createAuthUser,
  hasColumn,
  type ShapeDb,
} from "./helpers/pglite-supabase";

const BUYER = "10000000-0000-4000-8000-000000000001";
const REFERRER = "10000000-0000-4000-8000-000000000002";
const INVITEE = "10000000-0000-4000-8000-000000000003";

describe.each(SHAPES)("gem ledger RPCs on the $name shape", ({ legacy }) => {
  let s: ShapeDb;
  let typeCol: "type" | "transaction_type";

  const svc = <T>(fn: () => Promise<T>) => asRole(s.db, "service_role", null, fn);
  const one = async <T>(sql: string, params: unknown[] = []) =>
    (await s.db.query<T>(sql, params)).rows[0] as T;
  const balance = async (uid: string) =>
    Number((await one<{ b: string | null }>("select gem_balance::text as b from public.user_kai_state where user_id = $1", [uid]))?.b ?? 0);
  const ledger = (key: string) =>
    s.db.query<{ user_id: string; amount: number; label: string }>(
      `select user_id::text, amount, ${typeCol}::text as label from public.gem_ledger where idempotency_key = $1`,
      [key],
    );

  beforeAll(async () => {
    s = await bootSupabaseLike({ legacy, legacyBefore: K011_LEGACY_BEFORE });
    for (const [id, email] of [[BUYER, "buyer@db-shape.test"], [REFERRER, "ref@db-shape.test"], [INVITEE, "inv@db-shape.test"]]) {
      await createAuthUser(s.db, id, email);
    }
    typeCol = (await hasColumn(s.db, "gem_ledger", "transaction_type")) ? "transaction_type" : "type";
  }, 60_000);

  afterAll(async () => {
    await s?.db.close();
  });

  it("has the shape this suite claims to test", async () => {
    expect(typeCol).toBe(legacy ? "transaction_type" : "type");
    expect(await hasColumn(s.db, "gem_ledger", "metadata")).toBe(!legacy);
  });

  it("purchase_market_item succeeds and charges exactly once", async () => {
    const item = await one<{ id: string; price: number }>(
      "select id, price from public.market_items where price > 0 order by price, id limit 1",
    );
    expect(item?.id).toBeTruthy();

    const start = await balance(BUYER); // includes the signup welcome bonus
    await svc(() =>
      s.db.query(
        "select public.earn_gems($1, $2, 'chat_message'::public.gem_transaction_type, 'seed', $3)",
        [BUYER, item.price + 7, `seed:${BUYER}`],
      ),
    );
    const before = await balance(BUYER);
    expect(before).toBe(start + item.price + 7);

    const key = `market:${BUYER}:${item.id}`;
    const res = await svc(() =>
      s.db.query<{ r: Record<string, unknown> }>("select public.purchase_market_item($1, $2, $3) as r", [BUYER, item.id, key]),
    );
    expect(res.rows[0]?.r).toMatchObject({ item_id: item.id, active_aura: item.id, applied: "true", duplicate: "false" });
    expect(Number(res.rows[0]?.r.balance)).toBe(before - item.price);

    // Retry with the same idempotency key: rejected, never charged twice.
    await expect(
      svc(() => s.db.query("select public.purchase_market_item($1, $2, $3)", [BUYER, item.id, key])),
    ).rejects.toThrow(/Already owned/);

    expect(await balance(BUYER)).toBe(before - item.price);
    const rows = (await ledger(key)).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ user_id: BUYER, amount: -item.price, label: "market_purchase" });
    const inv = await one<{ n: number }>(
      "select count(*)::int as n from public.user_market_inventory where user_id = $1 and item_id = $2",
      [BUYER, item.id],
    );
    expect(inv.n).toBe(1);
  });

  it("process_referral credits both sides exactly once", async () => {
    const code = (await one<{ c: string }>("select referral_code as c from public.profiles where id = $1", [REFERRER])).c;
    expect(code).toBeTruthy();
    const inviteeStart = await balance(INVITEE);
    const referrerStart = await balance(REFERRER);

    const first = await svc(() =>
      s.db.query<{ r: Record<string, unknown> }>("select public.process_referral($1, $2) as r", [INVITEE, code]),
    );
    expect(first.rows[0]?.r).toMatchObject({
      applied: true,
      duplicate: false,
      referrer_id: REFERRER,
      referrer_rewarded: true,
      bonus: 100,
      skin_reward: "thunder",
    });

    const again = await svc(() =>
      s.db.query<{ r: Record<string, unknown> }>("select public.process_referral($1, $2) as r", [INVITEE, code]),
    );
    expect(again.rows[0]?.r).toMatchObject({ applied: false, duplicate: true, referrer_id: REFERRER });

    const invitee = (await ledger(`referral_referred:${INVITEE}`)).rows;
    const referrer = (await ledger(`referral_referrer:${INVITEE}`)).rows;
    expect(invitee).toEqual([{ user_id: INVITEE, amount: 100, label: "referral_bonus" }]);
    expect(referrer).toEqual([{ user_id: REFERRER, amount: 100, label: "referral_bonus" }]);
    expect(await balance(INVITEE)).toBe(inviteeStart + 100);
    expect(await balance(REFERRER)).toBe(referrerStart + 100);

    const skin = await one<{ n: number }>(
      "select count(*)::int as n from public.user_market_inventory where user_id = $1 and item_id = 'thunder'",
      [REFERRER],
    );
    expect(skin.n).toBe(1);
    const prof = await one<{ c: string }>("select referred_by_code as c from public.profiles where id = $1", [INVITEE]);
    expect(prof.c).toBe(code);
  });

  it("earn, spend and daily check-in keep working", async () => {
    await svc(() =>
      s.db.query("select public.earn_gems($1, 5, 'chat_message'::public.gem_transaction_type, 'x', $2)", [REFERRER, `earn:${REFERRER}`]),
    );
    await svc(() =>
      s.db.query("select public.spend_gems($1, 5, 'market_purchase'::public.gem_transaction_type, 'x', $2)", [REFERRER, `spend:${REFERRER}`]),
    );
    await svc(() => s.db.query("select public.perform_daily_check_in(null, $1)", [REFERRER]));
    expect((await ledger(`earn:${REFERRER}`)).rows).toHaveLength(1);
    expect((await ledger(`spend:${REFERRER}`)).rows).toHaveLength(1);
  });
});
