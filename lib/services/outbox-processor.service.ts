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

type OutboxRow = {
  id: string;
  event_type: string;
  aggregate_id: string;
  user_id: string | null;
  payload: Record<string, unknown>;
  occurred_at: string;
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
    case "account.deleted":
    case "account.exported":
    case "billing.webhook.received":
    case "consent.granted":
    case "consent.revoked":
      // Audit trail only — sync side effects already ran at emit time.
      break;
    default:
      logger.warn("outbox.unknown event type", {
        eventType: row.event_type,
        id: row.id,
      });
  }
}

/**
 * Processes pending domain events: dispatch handlers, then mark processed.
 * Failed handlers leave the row pending for the next cron pass.
 */
export async function processDomainEventOutbox(): Promise<{
  processed: number;
  failed: number;
}> {
  const admin = createAdminSupabaseClient();
  const db = admin as unknown as SupabaseClient;

  const { data: pending, error: readError } = await db
    .from("domain_events")
    .select("id, event_type, aggregate_id, user_id, payload, occurred_at")
    .is("processed_at", null)
    .order("occurred_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (readError) {
    logger.error("outbox.read failed", { error: readError.message });
    throw readError;
  }

  const rows = (pending ?? []) as OutboxRow[];
  if (rows.length === 0) {
    return { processed: 0, failed: 0 };
  }

  let processed = 0;
  let failed = 0;
  const now = new Date().toISOString();

  for (const row of rows) {
    try {
      await handleOutboxEvent(row);

      const { error: updateError } = await db
        .from("domain_events")
        .update({ processed_at: now })
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
      logger.error("outbox.handler failed", {
        id: row.id,
        eventType: row.event_type,
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  return { processed, failed };
}
