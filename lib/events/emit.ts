import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { type DomainEvent } from "@/lib/events/types";

async function persistDomainEvent(event: DomainEvent): Promise<void> {
  const admin = createAdminSupabaseClient();
  const db = admin as unknown as SupabaseClient;

  const { error } = await db.from("domain_events").insert({
    event_type: event.type,
    aggregate_id: event.aggregateId,
    user_id: event.userId ?? null,
    payload: event.payload ?? {},
    occurred_at: event.occurredAt,
  });

  if (error) {
    throw error;
  }
}

/**
 * Publishes a domain event: structured log + outbox insert (fail-open on DB).
 */
export function emitDomainEvent(event: DomainEvent): void {
  logger.info("domain.event", {
    eventType: event.type,
    aggregateId: event.aggregateId,
    userId: event.userId,
    payload: event.payload,
    occurredAt: event.occurredAt,
  });

  void persistDomainEvent(event).catch((error) => {
    logger.warn("domain.event persist failed", {
      eventType: event.type,
      error: error instanceof Error ? error.message : "unknown",
    });
  });
}
