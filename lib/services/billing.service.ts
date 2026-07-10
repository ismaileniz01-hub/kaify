import { createHmac, timingSafeEqual } from "crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { buildPaddlePriceTierMap } from "@/lib/billing/paddle-config";
import type { SubscriptionTier } from "@/lib/types/database.types";

type BillingCycle = "monthly" | "yearly";

type PaddleCustomData = {
  user_id?: string;
  userId?: string;
};

type PaddleSubscriptionData = {
  id?: string;
  status?: string;
  custom_data?: PaddleCustomData | null;
  items?: Array<{ price?: { id?: string } }>;
  billing_cycle?: { interval?: string };
  customer_id?: string;
};

export type PaddleWebhookPayload = {
  event_id: string;
  event_type: string;
  occurred_at?: string;
  data?: PaddleSubscriptionData;
};

/** Verifies Paddle Billing webhook signature (`Paddle-Signature` header). */
export function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader?.trim()) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(";").map((part) => {
      const eq = part.indexOf("=");
      if (eq === -1) return [part, ""];
      return [part.slice(0, eq), part.slice(eq + 1)];
    }),
  );

  const ts = parts.ts;
  const h1 = parts.h1;
  if (!ts || !h1) return false;

  const ageMs = Date.now() - Number(ts) * 1000;
  if (!Number.isFinite(ageMs) || ageMs > 5 * 60 * 1000 || ageMs < -60_000) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${ts}:${rawBody}`)
    .digest("hex");

  try {
    const a = Buffer.from(h1, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

async function resolveUserId(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  data: PaddleSubscriptionData,
): Promise<string | null> {
  const custom = data.custom_data;
  const fromCustom = custom?.user_id ?? custom?.userId;
  if (typeof fromCustom === "string" && fromCustom.trim()) {
    return fromCustom.trim();
  }
  return null;
}

async function applyTier(
  userId: string,
  tier: SubscriptionTier,
  billingCycle: BillingCycle,
): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { error } = await admin.rpc("apply_subscription", {
    p_user_id: userId,
    p_tier: tier,
    p_billing_cycle: billingCycle,
  });
  if (error) {
    console.error("[billing] apply_subscription failed", {
      userId,
      tier,
      error: error.message,
    });
    throw error;
  }
}

async function revokeSubscription(userId: string): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("profiles")
    .update({
      tier: null,
      tier_expires_at: null,
      tier_started_at: null,
    })
    .eq("id", userId);
  if (error) {
    console.error("[billing] revoke_subscription failed", {
      userId,
      error: error.message,
    });
    throw error;
  }
}

type BillingEventRow = {
  provider_event_id: string;
  event_type: string;
  user_id: string | null;
  payload: unknown;
};

async function upsertBillingEvent(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  eventId: string,
  eventType: string,
  userId: string | null,
  payload: unknown,
): Promise<boolean> {
  const billingDb = admin as unknown as {
    from: (table: "billing_events") => {
      upsert: (
        row: BillingEventRow,
        options: { onConflict: string; ignoreDuplicates: boolean },
      ) => Promise<{ error: { code?: string; message: string } | null }>;
    };
  };

  const { error } = await billingDb.from("billing_events").upsert(
    {
      provider_event_id: eventId,
      event_type: eventType,
      user_id: userId,
      payload,
    },
    { onConflict: "provider_event_id", ignoreDuplicates: true },
  );

  if (error?.code === "23505") return false;
  if (error) throw error;
  return true;
}

function billingCycleFromData(data: PaddleSubscriptionData): BillingCycle {
  const interval = data.billing_cycle?.interval?.toLowerCase();
  if (interval === "year") return "yearly";
  return "monthly";
}

function priceIdFromData(data: PaddleSubscriptionData): string | undefined {
  const id = data.items?.[0]?.price?.id;
  return typeof id === "string" && id.trim() ? id.trim() : undefined;
}

/**
 * Processes a verified Paddle Billing webhook. Idempotent via provider_event_id.
 */
export async function handlePaddleWebhook(
  eventId: string,
  payload: PaddleWebhookPayload,
): Promise<{ ok: true; skipped?: boolean } | { ok: false; reason: string }> {
  const admin = createAdminSupabaseClient();
  const eventType = payload.event_type ?? "unknown";
  const data = payload.data;

  if (!data) {
    return { ok: false, reason: "missing_data" };
  }

  const userId = await resolveUserId(admin, data);
  const inserted = await upsertBillingEvent(
    admin,
    eventId,
    eventType,
    userId,
    payload,
  );
  if (!inserted) {
    return { ok: true, skipped: true };
  }

  const priceMap = buildPaddlePriceTierMap();
  const priceId = priceIdFromData(data);
  const tier = priceId ? priceMap[priceId] : undefined;
  const status = (data.status ?? "").toLowerCase();
  const billingCycle = billingCycleFromData(data);

  switch (eventType) {
    case "subscription.created":
    case "subscription.updated":
    case "subscription.activated":
    case "subscription.resumed": {
      if (!userId) return { ok: false, reason: "user_not_found" };
      if (!tier) return { ok: false, reason: "unknown_price" };
      if (status === "active" || status === "trialing") {
        await applyTier(userId, tier, billingCycle);
      } else if (status === "canceled" || status === "cancelled") {
        await revokeSubscription(userId);
      }
      break;
    }
    case "subscription.canceled":
    case "subscription.cancelled": {
      if (!userId) return { ok: false, reason: "user_not_found" };
      await revokeSubscription(userId);
      break;
    }
    case "subscription.past_due":
    case "subscription.paused":
      break;
    default:
      break;
  }

  return { ok: true };
}
