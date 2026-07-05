import { createHmac, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { createDomainEvent } from "@/lib/events/types";
import { emitDomainEvent } from "@/lib/events/emit";
import type { SubscriptionTier } from "@/lib/types/database.types";

type LemonWebhookPayload = {
  meta?: {
    event_name?: string;
    custom_data?: Record<string, unknown>;
  };
  data?: {
    id?: string;
    type?: string;
    attributes?: Record<string, unknown>;
    relationships?: Record<string, unknown>;
  };
};

const TIER_EVENTS = new Set([
  "subscription_created",
  "subscription_updated",
  "subscription_payment_success",
]);

const DOWNGRADE_EVENTS = new Set([
  "subscription_cancelled",
  "subscription_expired",
  "subscription_payment_failed",
]);

function envVariantMap(): Record<string, SubscriptionTier> {
  const map: Record<string, SubscriptionTier> = {};
  const pairs: [string | undefined, SubscriptionTier][] = [
    [process.env.LEMON_SQUEEZY_VARIANT_ESSENTIAL, "essential"],
    [process.env.LEMON_SQUEEZY_VARIANT_PRO, "pro"],
    [process.env.LEMON_SQUEEZY_VARIANT_PREMIUM_MAX, "premium_max"],
  ];
  for (const [variantId, tier] of pairs) {
    if (variantId?.trim()) map[variantId.trim()] = tier;
  }
  return map;
}

/** Verifies Lemon Squeezy webhook HMAC signature (hex digest). */
export function verifyLemonSqueezySignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature?.trim()) return false;
  const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(digest), Buffer.from(signature.trim()));
  } catch {
    return false;
  }
}

function resolveUserId(payload: LemonWebhookPayload): string | null {
  const custom = payload.meta?.custom_data;
  const fromCustom = custom?.user_id ?? custom?.userId;
  if (typeof fromCustom === "string" && fromCustom.length > 0) return fromCustom;
  return null;
}

function resolveCustomerEmail(payload: LemonWebhookPayload): string | null {
  const attrs = payload.data?.attributes ?? {};
  const email = attrs.user_email ?? attrs.customer_email ?? attrs.email;
  return typeof email === "string" ? email.toLowerCase() : null;
}

function resolveVariantId(payload: LemonWebhookPayload): string | null {
  const attrs = payload.data?.attributes ?? {};
  const record = attrs as Record<string, unknown>;
  const firstItem = record.first_subscription_item as Record<string, unknown> | undefined;
  const variant =
    record.variant_id ??
    firstItem?.variant_id ??
    record.product_id;
  return variant != null ? String(variant) : null;
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) {
    logger.warn("billing.lookup email failed", { error: error.message });
    return null;
  }
  const match = data.users.find((u) => u.email?.toLowerCase() === email);
  return match?.id ?? null;
}

async function applyTier(
  userId: string,
  tier: SubscriptionTier,
  billingCycle: "monthly" | "yearly",
): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { error } = await admin.rpc("apply_subscription", {
    p_user_id: userId,
    p_tier: tier,
    p_billing_cycle: billingCycle,
  });
  if (error) {
    logger.error("billing.apply_subscription failed", {
      userId,
      tier,
      error: error.message,
    });
    throw new ApiError("INTERNAL_ERROR", "Abonelik güncellenemedi.");
  }
}

async function downgradeToEssential(userId: string): Promise<void> {
  await applyTier(userId, "essential", "monthly");
}

/**
 * Processes a verified Lemon Squeezy webhook. Idempotent via lemon_event_id.
 */
export async function handleLemonSqueezyWebhook(
  eventId: string,
  payload: LemonWebhookPayload,
): Promise<{ processed: boolean; userId: string | null }> {
  const admin = createAdminSupabaseClient();
  const db = admin as unknown as SupabaseClient;

  const eventName = payload.meta?.event_name ?? "unknown";
  const attrs = payload.data?.attributes ?? {};

  let userId = resolveUserId(payload);
  const customerEmail = resolveCustomerEmail(payload);

  if (!userId && customerEmail) {
    userId = await findUserIdByEmail(customerEmail);
  }

  const { error: insertError } = await db.from("billing_events").insert({
    lemon_event_id: eventId,
    event_name: eventName,
    user_id: userId,
    order_id: attrs.order_id != null ? String(attrs.order_id) : null,
    subscription_id:
      payload.data?.type === "subscriptions" && payload.data.id
        ? String(payload.data.id)
        : attrs.subscription_id != null
          ? String(attrs.subscription_id)
          : null,
    customer_email: customerEmail,
    payload,
    processed_at: new Date().toISOString(),
  });

  if (insertError?.code === "23505") {
    return { processed: false, userId };
  }
  if (insertError) {
    logger.error("billing.event insert failed", { error: insertError.message });
    throw new ApiError("INTERNAL_ERROR", "Ödeme kaydı oluşturulamadı.");
  }

  emitDomainEvent(
    createDomainEvent(
      "billing.webhook.received",
      eventId,
      { eventName, userId },
      userId ?? undefined,
    ),
  );

  if (!userId) {
    logger.warn("billing.webhook no user match", { eventName, customerEmail });
    return { processed: true, userId: null };
  }

  if (DOWNGRADE_EVENTS.has(eventName)) {
    await downgradeToEssential(userId);
    return { processed: true, userId };
  }

  if (!TIER_EVENTS.has(eventName)) {
    return { processed: true, userId };
  }

  const variantMap = envVariantMap();
  const variantId = resolveVariantId(payload);
  const tier = variantId ? variantMap[variantId] : undefined;

  if (!tier) {
    logger.warn("billing.webhook unknown variant", { variantId, eventName });
    return { processed: true, userId };
  }

  const interval = attrs.variant_interval ?? attrs.billing_interval;
  const billingCycle =
    interval === "year" || interval === "yearly" ? "yearly" : "monthly";

  await applyTier(userId, tier, billingCycle);
  return { processed: true, userId };
}
