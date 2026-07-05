import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const BATCH_SIZE = 100;

type OutboxRow = {
  id: string;
  event_type: string;
  aggregate_id: string;
  user_id: string | null;
  payload: Record<string, unknown>;
  occurred_at: string;
};

/** Marks pending domain events as processed (Phase 1: audit trail only). */
export async function processDomainEventOutbox(): Promise<{
  processed: number;
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
    return { processed: 0 };
  }

  const now = new Date().toISOString();
  const ids = rows.map((r) => r.id);

  const { error: updateError } = await db
    .from("domain_events")
    .update({ processed_at: now })
    .in("id", ids);

  if (updateError) {
    logger.error("outbox.mark processed failed", { error: updateError.message });
    throw updateError;
  }

  for (const row of rows) {
    logger.info("outbox.processed", {
      eventType: row.event_type,
      aggregateId: row.aggregate_id,
      userId: row.user_id,
    });
  }

  return { processed: rows.length };
}
