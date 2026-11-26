/**
 * K-011 (a)/(d): the REAL billing and profile services, run against the REAL
 * migrated schema (PGlite) through a supabase-js-like fake client, on both the
 * migration-only shape and the legacy production shape
 * (profiles.full_name / subscription_tier / height / weight / experience).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  K011_LEGACY_BEFORE,
  SHAPES,
  bootSupabaseLike,
  createAuthUser,
  hasColumn,
  type ShapeDb,
} from "./helpers/pglite-supabase";
import { makeFakeSupabaseClient, type FakeSupabaseClient } from "./helpers/fake-supabase-client";

const h = vi.hoisted(() => ({ admin: null as unknown, user: null as unknown }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabaseClient: () => h.admin }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: async () => h.user }));
vi.mock("@/lib/events/product", () => ({
  emitProductEvent: () => undefined,
  hashReferralCampaignId: () => "test",
  productEventIdempotencyKey: (parts: string[]) => parts.join(":"),
}));

import { handleNormalizedPaddleEvent } from "@/lib/services/billing.service";
import { updateOwnProfile } from "@/lib/services/profile.service";
import { mapProfileRow } from "@/lib/types/domain.types";
import type { ProfileRow } from "@/lib/types/domain.types";

const PRO_MONTHLY = "pri_01kx5zwffccfx1prqtj0b7r3t9";
const SUBSCRIBER = "20000000-0000-4000-8000-000000000001";
const EDITOR = "20000000-0000-4000-8000-000000000002";
const SPOOFER = "20000000-0000-4000-8000-000000000003";
const STALE = "20000000-0000-4000-8000-000000000004";

const paddleEvent = (id: string, type: string, at: string, status: string, userId: string | null) => {
  const data = {
    id: "sub_db_shape",
    status,
    customerId: "ctm_db_shape",
    customData: userId ? { user_id: userId } : null,
    items: [{ price: { id: PRO_MONTHLY, productId: "pro_db_shape" } }],
    currentBillingPeriod: { startsAt: "2026-11-20T00:00:00Z", endsAt: "2026-12-20T00:00:00Z" },
  };
  return { eventId: id, eventType: type, occurredAt: at, data, rawPayload: { event_id: id, event_type: type, data } };
};

describe.each(SHAPES)("profile + billing services on the $name shape", ({ legacy }) => {
  let s: ShapeDb;
  let admin: FakeSupabaseClient;

  const row = async (uid: string) =>
    (await s.db.query<Record<string, unknown>>("select * from public.profiles where id = $1", [uid])).rows[0]!;

  beforeAll(async () => {
    s = await bootSupabaseLike({
      legacy,
      legacyBefore: K011_LEGACY_BEFORE,
      // A legacy row left stale by 20260823210000 (tier cleared, legacy mirror kept).
      afterLegacyConversion: async (db) => {
        await createAuthUser(db, STALE, "stale@db-shape.test");
        await db.exec("select set_config('app.guard_bypass', 'on', false)");
        await db.query("update public.profiles set tier = null, subscription_tier = 'pro' where id = $1", [STALE]);
        await db.exec("select set_config('app.guard_bypass', '', false)");
      },
    });
    for (const [id, email] of [[SUBSCRIBER, "sub@db-shape.test"], [EDITOR, "edit@db-shape.test"], [SPOOFER, "spoof@db-shape.test"]]) {
      await createAuthUser(s.db, id, email);
    }
    admin = makeFakeSupabaseClient(s.db, { role: "service_role" });
  }, 60_000);

  beforeEach(() => {
    h.admin = admin;
    h.user = null;
  });

  afterAll(async () => {
    await s?.db.close();
  });

  it("has the shape this suite claims to test", async () => {
    for (const c of ["full_name", "subscription_tier", "height", "weight", "experience"]) {
      expect(await hasColumn(s.db, "profiles", c), c).toBe(legacy);
    }
  });

  it("subscription cancel revokes access", async () => {
    const activated = await handleNormalizedPaddleEvent(
      paddleEvent("evt_db_shape_1", "subscription.activated", "2026-11-20T00:00:00Z", "active", SUBSCRIBER),
    );
    expect(activated).toMatchObject({ ok: true });
    expect((await row(SUBSCRIBER)).tier).toBe("pro");

    const canceled = await handleNormalizedPaddleEvent(
      paddleEvent("evt_db_shape_2", "subscription.canceled", "2026-11-25T00:00:00Z", "canceled", null),
    );
    expect(canceled).toMatchObject({ ok: true });
    const after = await row(SUBSCRIBER);
    expect(after.tier).toBeNull();
    expect(after.tier_expires_at).toBeNull();
    if (legacy) expect(after.subscription_tier).toBeNull();
    expect(mapProfileRow(after as unknown as ProfileRow).tier).toBeNull();
  });

  it("profile name / height / weight / experience update works", async () => {
    h.user = makeFakeSupabaseClient(s.db, { role: "authenticated", uid: EDITOR });
    const dto = await updateOwnProfile(EDITOR, {
      displayName: "Shape Tester",
      heightCm: 181,
      weightKg: 77.5,
      experienceLevel: "intermediate",
    } as Parameters<typeof updateOwnProfile>[1]);
    expect(dto).toMatchObject({ displayName: "Shape Tester", heightCm: 181, weightKg: 77.5, experienceLevel: "intermediate" });

    const r = await row(EDITOR);
    expect(r).toMatchObject({ display_name: "Shape Tester", height_cm: 181, experience_level: "intermediate" });
    expect(Number(r.weight_kg)).toBe(77.5);
    if (legacy) {
      // Legacy mirror columns are still dual-written when they exist.
      expect(r).toMatchObject({ full_name: "Shape Tester", height: 181, experience: "intermediate" });
      expect(Number(r.weight)).toBe(77.5);
    }
  });

  it("a user cannot set subscription_tier (or tier) on their own profile", async () => {
    const user = makeFakeSupabaseClient(s.db, { role: "authenticated", uid: SPOOFER });
    if (!legacy) {
      const { error } = await user.from("profiles").update({ subscription_tier: "premium_max" }).eq("id", SPOOFER);
      expect(error?.code).toBe("42703");
      return;
    }
    const { error } = await user
      .from("profiles")
      .update({ subscription_tier: "premium_max", tier: "premium_max" })
      .eq("id", SPOOFER);
    expect(error).toBeNull();
    const r = await row(SPOOFER);
    expect(r.tier).toBeNull();
    expect(r.subscription_tier).toBeNull();
    expect(mapProfileRow(r as unknown as ProfileRow).tier).toBeNull();
  });

  it("no unpaid profile carries a stale legacy plan", async () => {
    if (!legacy) return;
    const r = await row(STALE);
    expect(r.tier).toBeNull();
    expect(r.subscription_tier).toBeNull();
    expect(mapProfileRow(r as unknown as ProfileRow).tier).toBeNull();
  });
});
