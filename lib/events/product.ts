import { createHash, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { featureFlags } from "@/lib/feature-flags";
import { logger } from "@/lib/logger";
import {
  sanitizeProductEvent,
  type ProductEventInput,
} from "@/lib/events/product-catalog";

export { PRODUCT_EVENT_NAMES, type ProductEventName } from "@/lib/events/product-catalog";

export function productEventIdempotencyKey(
  parts: Array<string | null | undefined>,
): string {
  return createHash("sha256")
    .update(parts.filter(Boolean).join("|"))
    .digest("hex")
    .slice(0, 64);
}

export function hashReferralCampaignId(code: string): string {
  return createHash("sha256")
    .update(code.trim().toUpperCase())
    .digest("hex")
    .slice(0, 16);
}

async function persistProductEvent(input: ProductEventInput): Promise<void> {
  if (!featureFlags.productEvents()) return;
  const sanitized = sanitizeProductEvent(input);
  if ("error" in sanitized) {
    logger.warn("product.event rejected", {
      name: input.name,
      error: sanitized.error,
    });
    return;
  }

  const admin = createAdminSupabaseClient() as unknown as SupabaseClient;
  const { error } = await admin.from("product_events").insert({
    event_id: randomUUID(),
    event_name: sanitized.event_name,
    occurred_at: sanitized.occurred_at,
    user_id: sanitized.user_id,
    install_id: sanitized.install_id,
    platform: sanitized.platform,
    schema_version: sanitized.schema_version,
    properties: sanitized.properties,
    idempotency_key: sanitized.idempotency_key,
  });

  if (error && !/duplicate|unique/i.test(error.message)) {
    throw error;
  }
}

export function emitFirstActivation(
  name:
    | "activation.action_completed"
    | "activation.first_workout_completed"
    | "activation.first_meal_logged"
    | "activation.first_scan_confirmed"
    | "activation.first_chat_action_completed",
  userId: string,
  action: string,
): void {
  emitProductEvent({
    name,
    userId,
    properties: { action, first: true },
    idempotencyKey: productEventIdempotencyKey([name, userId]),
  });
}

/** Fail-open product analytics write. Never throws to callers. */
export function emitProductEvent(input: ProductEventInput): void {
  void persistProductEvent(input).catch((error) => {
    logger.warn("product.event persist failed", {
      name: input.name,
      error: error instanceof Error ? error.message : "unknown",
    });
  });
}
