import { createHmac, timingSafeEqual } from "crypto";
import { EventName } from "@paddle/paddle-node-sdk";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { buildPaddlePriceTierMap } from "@/lib/billing/paddle-config";
import {
  getPaddleServerClient,
  getPaddleWebhookSecret,
  isPaddleServerConfigured,
} from "@/lib/billing/paddle-server";
import {
  subscriptionGrantsAccess,
  subscriptionIsCanceled,
} from "@/lib/billing/subscription-access";
import { applyLegacyProfileWrites } from "@/lib/supabase/profile-compat";
import type { SubscriptionTier } from "@/lib/types/database.types";

type BillingCycle = "monthly" | "yearly";

export type PaddleWebhookPayload = {
  event_id: string;
  event_type: string;
  occurred_at?: string;
  data?: Record<string, unknown>;
};

type NormalizedEvent = {
  eventId: string;
  eventType: string;
  data: Record<string, unknown>;
  rawPayload: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function extractCustomUserId(custom: unknown): string | null {
  const record = asRecord(custom);
  if (!record) return null;
  return pickString(record.user_id, record.userId) ?? null;
}

function entityToRecord(entity: unknown): Record<string, unknown> {
  if (!entity || typeof entity !== "object") return {};
  // Prefer JSON round-trip so SDK class instances (camelCase getters) flatten.
  try {
    const json = JSON.parse(JSON.stringify(entity)) as unknown;
    const record = asRecord(json);
    if (record && Object.keys(record).length > 0) return record;
  } catch {
    // fall through
  }
  const source = entity as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(source)) {
    out[key] = source[key];
  }
  return out;
}

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

/**
 * Prefer SDK `webhooks.unmarshal` (raw body). Falls back to HMAC when the API
 * key is missing so existing webhook secret-only setups keep working.
 */
export async function verifyAndParsePaddleWebhook(
  rawBody: string,
  signatureHeader: string | null,
): Promise<NormalizedEvent> {
  const secret = getPaddleWebhookSecret();
  if (!secret) {
    throw new Error("webhook_not_configured");
  }
  if (!signatureHeader?.trim()) {
    throw new Error("invalid_signature");
  }

  if (isPaddleServerConfigured()) {
    try {
      const paddle = getPaddleServerClient();
      const event = await paddle.webhooks.unmarshal(
        rawBody,
        secret,
        signatureHeader,
      );
      return {
        eventId: event.eventId,
        eventType: String(event.eventType),
        data: entityToRecord(event.data),
        rawPayload: {
          event_id: event.eventId,
          event_type: event.eventType,
          occurred_at: event.occurredAt,
          data: event.data,
        },
      };
    } catch {
      throw new Error("invalid_signature");
    }
  }

  if (!verifyPaddleSignature(rawBody, signatureHeader, secret)) {
    throw new Error("invalid_signature");
  }

  let payload: PaddleWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as PaddleWebhookPayload;
  } catch {
    throw new Error("invalid_json");
  }

  const eventId = payload.event_id?.trim();
  if (!eventId) throw new Error("missing_event_id");
  if (!payload.data) throw new Error("missing_data");

  return {
    eventId,
    eventType: payload.event_type ?? "unknown",
    data: asRecord(payload.data) ?? {},
    rawPayload: payload,
  };
}

async function resolveUserId(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  data: Record<string, unknown>,
): Promise<string | null> {
  const fromCustom =
    extractCustomUserId(data.customData) ??
    extractCustomUserId(data.custom_data);
  if (fromCustom) return fromCustom;

  const customerId = pickString(data.customerId, data.customer_id);
  if (!customerId) return null;

  const { data: row } = await admin
    .from("paddle_customers")
    .select("user_id")
    .eq("customer_id", customerId)
    .maybeSingle();

  return typeof row?.user_id === "string" ? row.user_id : null;
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

  // Plan change: Paddle cancels the old sub after the new one is active.
  // Never wipe access while another granting subscription remains.
  const { data: activeRows, error: activeError } = await admin
    .from("paddle_subscriptions")
    .select("subscription_id")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .limit(1);

  if (activeError) {
    console.error("[billing] revoke active-sub check failed", {
      userId,
      error: activeError.message,
    });
    throw activeError;
  }

  if (activeRows && activeRows.length > 0) {
    console.info("[billing] skip revoke; other active subscription exists", {
      userId,
      keep: activeRows[0]?.subscription_id,
    });
    return;
  }

  const updates = applyLegacyProfileWrites({
    tier: null,
    tier_expires_at: null,
    tier_started_at: null,
  });
  const { error } = await admin
    .from("profiles")
    .update(updates as never)
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
  event_name: string;
  user_id: string | null;
  payload: unknown;
  subscription_id?: string | null;
  customer_email?: string | null;
  processed_at?: string;
};

/**
 * Claims a webhook event for processing. Returns false if already seen
 * (unique on provider_event_id). Uses INSERT — not upsert+ignoreDuplicates,
 * which silently no-ops without surfacing a duplicate.
 */
async function claimBillingEvent(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  eventId: string,
  eventType: string,
  userId: string | null,
  payload: unknown,
  extras?: { subscriptionId?: string | null; customerEmail?: string | null },
): Promise<boolean> {
  const billingDb = admin as unknown as {
    from: (table: "billing_events") => {
      insert: (
        row: BillingEventRow,
      ) => Promise<{ error: { code?: string; message: string } | null }>;
    };
  };

  const { error } = await billingDb.from("billing_events").insert({
    provider_event_id: eventId,
    event_name: eventType,
    user_id: userId,
    payload,
    subscription_id: extras?.subscriptionId ?? null,
    customer_email: extras?.customerEmail ?? null,
    processed_at: new Date().toISOString(),
  });

  if (error?.code === "23505") return false;
  if (error) throw error;
  return true;
}

function billingCycleFromData(data: Record<string, unknown>): BillingCycle {
  const cycle = asRecord(data.billingCycle) ?? asRecord(data.billing_cycle);
  const interval = pickString(cycle?.interval)?.toLowerCase();
  if (interval === "year") return "yearly";
  return "monthly";
}

function priceIdFromData(data: Record<string, unknown>): string | undefined {
  const items = Array.isArray(data.items) ? data.items : [];
  const first = asRecord(items[0]);
  if (!first) return undefined;
  const price = asRecord(first.price);
  return pickString(price?.id);
}

function productIdFromData(data: Record<string, unknown>): string {
  const items = Array.isArray(data.items) ? data.items : [];
  const first = asRecord(items[0]);
  if (!first) return "";
  const price = asRecord(first.price);
  const product = asRecord(first.product);
  return (
    pickString(price?.productId, price?.product_id, product?.id) ?? ""
  );
}

function scheduledChangeFromData(data: Record<string, unknown>): {
  action: string | null;
  at: string | null;
} {
  const change =
    asRecord(data.scheduledChange) ?? asRecord(data.scheduled_change);
  if (!change) return { action: null, at: null };
  return {
    action: pickString(change.action) ?? null,
    at: pickString(change.effectiveAt, change.effective_at) ?? null,
  };
}

async function upsertPaddleCustomer(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  customerId: string,
  email: string,
  userId: string | null,
): Promise<void> {
  const { data: existing } = await admin
    .from("paddle_customers")
    .select("user_id")
    .eq("customer_id", customerId)
    .maybeSingle();

  const { error } = await admin.from("paddle_customers").upsert(
    {
      customer_id: customerId,
      email,
      user_id: userId ?? existing?.user_id ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "customer_id" },
  );
  if (error) throw error;
}

async function upsertPaddleSubscription(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  input: {
    subscriptionId: string;
    customerId: string;
    userId: string | null;
    status: string;
    priceId: string;
    productId: string;
    scheduledChangeAction: string | null;
    scheduledChangeAt: string | null;
  },
): Promise<void> {
  const { data: existing } = await admin
    .from("paddle_subscriptions")
    .select("user_id")
    .eq("subscription_id", input.subscriptionId)
    .maybeSingle();

  const { error } = await admin.from("paddle_subscriptions").upsert(
    {
      subscription_id: input.subscriptionId,
      customer_id: input.customerId,
      user_id: input.userId ?? existing?.user_id ?? null,
      status: input.status,
      price_id: input.priceId,
      product_id: input.productId,
      scheduled_change_action: input.scheduledChangeAction,
      scheduled_change_at: input.scheduledChangeAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "subscription_id" },
  );
  if (error) throw error;
}

async function ensureCustomerStub(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  customerId: string,
  userId: string | null,
  email?: string,
): Promise<void> {
  const { data: existing } = await admin
    .from("paddle_customers")
    .select("customer_id, user_id, email")
    .eq("customer_id", customerId)
    .maybeSingle();

  if (existing) {
    if (userId && !existing.user_id) {
      await admin
        .from("paddle_customers")
        .update({
          user_id: userId,
          updated_at: new Date().toISOString(),
        })
        .eq("customer_id", customerId);
    }
    return;
  }

  await upsertPaddleCustomer(
    admin,
    customerId,
    email ?? `${customerId}@paddle.local`,
    userId,
  );
}

async function syncSubscriptionMirror(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  data: Record<string, unknown>,
  userId: string | null,
): Promise<void> {
  const subscriptionId = pickString(data.id);
  const customerId = pickString(data.customerId, data.customer_id);
  const status = pickString(data.status) ?? "unknown";
  const priceId = priceIdFromData(data) ?? "";
  if (!subscriptionId || !customerId) return;

  await ensureCustomerStub(admin, customerId, userId);
  const scheduled = scheduledChangeFromData(data);
  await upsertPaddleSubscription(admin, {
    subscriptionId,
    customerId,
    userId,
    status,
    priceId,
    productId: productIdFromData(data),
    scheduledChangeAction: scheduled.action,
    scheduledChangeAt: scheduled.at,
  });
}

async function handleCustomerEvent(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  data: Record<string, unknown>,
): Promise<string | null> {
  const customerId = pickString(data.id);
  const email = pickString(data.email);
  if (!customerId || !email) return null;
  const userId = extractCustomUserId(data.customData) ??
    extractCustomUserId(data.custom_data);
  await upsertPaddleCustomer(admin, customerId, email, userId);
  return userId;
}

async function provisionFromPrice(
  userId: string,
  data: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const priceMap = buildPaddlePriceTierMap();
  const priceId = priceIdFromData(data);
  const tier = priceId ? priceMap[priceId] : undefined;
  if (!tier) return { ok: false, reason: "unknown_price" };
  await applyTier(userId, tier, billingCycleFromData(data));
  return { ok: true };
}

/**
 * Processes a verified Paddle Billing webhook. Idempotent via provider_event_id.
 */
export async function handlePaddleWebhook(
  eventId: string,
  payload: PaddleWebhookPayload,
): Promise<{ ok: true; skipped?: boolean } | { ok: false; reason: string }> {
  return handleNormalizedPaddleEvent({
    eventId,
    eventType: payload.event_type ?? "unknown",
    data: asRecord(payload.data) ?? {},
    rawPayload: payload,
  });
}

export async function handleNormalizedPaddleEvent(
  event: NormalizedEvent,
): Promise<{ ok: true; skipped?: boolean } | { ok: false; reason: string }> {
  const admin = createAdminSupabaseClient();
  const { eventId, eventType, data, rawPayload } = event;

  if (!data || Object.keys(data).length === 0) {
    return { ok: false, reason: "missing_data" };
  }

  let userId = await resolveUserId(admin, data);
  const subscriptionId = pickString(
    data.id,
    data.subscriptionId,
    data.subscription_id,
  );
  const customerEmail = pickString(data.email);

  const inserted = await claimBillingEvent(
    admin,
    eventId,
    eventType,
    userId,
    rawPayload,
    { subscriptionId, customerEmail },
  );
  if (!inserted) {
    return { ok: true, skipped: true };
  }

  switch (eventType) {
    case EventName.CustomerCreated:
    case EventName.CustomerUpdated:
    case "customer.created":
    case "customer.updated": {
      userId = (await handleCustomerEvent(admin, data)) ?? userId;
      break;
    }

    case EventName.SubscriptionCreated:
    case EventName.SubscriptionUpdated:
    case EventName.SubscriptionActivated:
    case EventName.SubscriptionResumed:
    case EventName.SubscriptionTrialing:
    case "subscription.created":
    case "subscription.updated":
    case "subscription.activated":
    case "subscription.resumed":
    case "subscription.trialing": {
      await syncSubscriptionMirror(admin, data, userId);
      if (!userId) return { ok: false, reason: "user_not_found" };
      const status = pickString(data.status) ?? "";
      if (subscriptionGrantsAccess(status)) {
        const result = await provisionFromPrice(userId, data);
        if (!result.ok) return result;
      } else if (subscriptionIsCanceled(status)) {
        await revokeSubscription(userId);
      }
      // paused / past_due / scheduled_change: keep current access
      break;
    }

    case EventName.SubscriptionCanceled:
    case "subscription.canceled":
    case "subscription.cancelled": {
      await syncSubscriptionMirror(admin, data, userId);
      if (!userId) return { ok: false, reason: "user_not_found" };
      await revokeSubscription(userId);
      break;
    }

    case EventName.SubscriptionPastDue:
    case EventName.SubscriptionPaused:
    case "subscription.past_due":
    case "subscription.paused": {
      await syncSubscriptionMirror(admin, data, userId);
      break;
    }

    case EventName.TransactionCompleted:
    case "transaction.completed": {
      const customerId = pickString(data.customerId, data.customer_id);
      if (customerId) {
        await ensureCustomerStub(admin, customerId, userId, customerEmail);
      }
      if (!userId) return { ok: false, reason: "user_not_found" };
      const result = await provisionFromPrice(userId, data);
      if (!result.ok) return result;
      break;
    }

    default:
      break;
  }

  return { ok: true };
}
