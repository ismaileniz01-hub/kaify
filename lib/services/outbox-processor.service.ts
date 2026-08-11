import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  invalidateHomeBundleCache,
  invalidateLeaderboardRankCache,
  invalidateUserReadCaches,
} from "@/lib/cache/invalidate";
import { logger } from "@/lib/logger";
import type { DomainEventType } from "@/lib/events/types";

const BATCH_SIZE = 100;
const MAX_ATTEMPTS = 5;

type OutboxRow = {
  id: string;
  event_type: string;
  aggregate_id: string;
  user_id: string | null;
  payload: Record<string, unknown>;
  occurred_at: string;
  attempt_count?: number | null;
  last_error?: string | null;
};

export type OutboxBacklog = {
  pending: number;
  oldestOccurredAt: string | null;
  poison: number;
  oldestAgeMinutes: number | null;
};

async function handleOutboxEvent(row: OutboxRow): Promise<void> {
  const type = row.event_type as DomainEventType;
  const userId = row.user_id;

  switch (type) {
    case "check_in.completed": {
      if (!userId) break;
      await Promise.all([
        invalidateHomeBundleCache(userId),
        invalidateLeaderboardRankCache(userId),
        invalidateUserReadCaches(userId),
      ]);
      break;
    }
    case "market.purchased": {
      if (!userId) break;
      await invalidateUserReadCaches(userId);
      break;
    }
    case "account.deleted": {
      if (userId) {
        const { purgeUserCaches } = await import("@/lib/cache/invalidate");
        await purgeUserCaches(userId);
      }
      break;
    }
    case "account.exported":
    case "billing.webhook.received":
    case "consent.granted":
    case "consent.revoked":
      break;
    default:
      logger.warn("outbox.unknown event type", {
        eventType: row.event_type,
        id: row.id,
      });
  }
}

export async function getOutboxBacklog(): Promise<OutboxBacklog> {
  const admin = createAdminSupabaseClient();

  try {
    const { data, error } = await admin.rpc("service_get_outbox_backlog");
    if (!error && data) {
      const row = data as {
        pending?: number;
        oldest_occurred_at?: string | null;
        poison?: number;
      };
      const oldest = row.oldest_occurred_at ?? null;
      const ageMin = oldest
        ? Math.max(0, Math.round((Date.now() - new Date(oldest).getTime()) / 60_000))
        : null;
      return {
        pending: Number(row.pending ?? 0),
        oldestOccurredAt: oldest,
        poison: Number(row.poison ?? 0),
        oldestAgeMinutes: ageMin,
      };
    }
  } catch {
    // fall through
  }

  const db = admin as unknown as SupabaseClient;
  const { data: pendingRows } = await db
    .from("domain_events")
    .select("id, occurred_at, attempt_count")
    .is("processed_at", null)
    .order("occurred_at", { ascending: true })
    .limit(500);

  const rows = pendingRows ?? [];
  const oldest = rows[0]?.occurred_at ?? null;
  const poison = rows.filter((r) => Number(r.attempt_count ?? 0) >= MAX_ATTEMPTS).length;
  return {
    pending: rows.length,
    oldestOccurredAt: oldest,
    poison,
    oldestAgeMinutes: oldest
      ? Math.max(0, Math.round((Date.now() - new Date(oldest).getTime()) / 60_000))
      : null,
  };
}

/**
 * Processes pending domain events: dispatch handlers, then mark processed.
 * Failed handlers increment attempt_count; poison messages are dead-lettered
 * after MAX_ATTEMPTS so the backlog cannot stall forever.
 */
export async function processDomainEventOutbox(): Promise<{
  processed: number;
  failed: number;
  deadLettered: number;
}> {
  const admin = createAdminSupabaseClient();
  const db = admin as unknown as SupabaseClient;

  const { data: pending, error: readError } = await db
    .from("domain_events")
    .select(
      "id, event_type, aggregate_id, user_id, payload, occurred_at, attempt_count, last_error",
    )
    .is("processed_at", null)
    .order("occurred_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (readError) {
    logger.error("outbox.read failed", { error: readError.message });
    throw readError;
  }

  const rows = (pending ?? []) as OutboxRow[];
  if (rows.length === 0) {
    return { processed: 0, failed: 0, deadLettered: 0 };
  }

  let processed = 0;
  let failed = 0;
  let deadLettered = 0;
  const now = new Date().toISOString();

  for (const row of rows) {
    const attempts = Number(row.attempt_count ?? 0);
    if (attempts >= MAX_ATTEMPTS) {
      const { error: dlError } = await db
        .from("domain_events")
        .update({
          processed_at: now,
          last_error: row.last_error ?? `dead-lettered after ${MAX_ATTEMPTS} attempts`,
        })
        .eq("id", row.id)
        .is("processed_at", null);
      if (!dlError) {
        deadLettered += 1;
        logger.error("outbox.dead-lettered", {
          id: row.id,
          eventType: row.event_type,
          attempts,
        });
      }
      continue;
    }

    try {
      await handleOutboxEvent(row);

      const { error: updateError } = await db
        .from("domain_events")
        .update({ processed_at: now, last_error: null })
        .eq("id", row.id)
        .is("processed_at", null);

      if (updateError) {
        logger.error("outbox.mark processed failed", {
          id: row.id,
          error: updateError.message,
        });
        failed += 1;
        continue;
      }

      processed += 1;
      logger.info("outbox.processed", {
        eventType: row.event_type,
        aggregateId: row.aggregate_id,
        userId: row.user_id,
      });
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : "unknown";
      await db
        .from("domain_events")
        .update({
          attempt_count: attempts + 1,
          last_error: message.slice(0, 500),
        })
        .eq("id", row.id)
        .is("processed_at", null);
      logger.error("outbox.handler failed", {
        id: row.id,
        eventType: row.event_type,
        attempt: attempts + 1,
        error: message,
      });
    }
  }

  return { processed, failed, deadLettered };
}
