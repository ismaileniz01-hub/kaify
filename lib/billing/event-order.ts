/**
 * Canonical Paddle event ordering: occurrence time, then type rank, then event id.
 * Arrival time is never used.
 */

export type BillingEventRankInput = {
  eventId: string;
  eventType: string;
  occurredAt?: string | null;
};

const TYPE_RANK: Record<string, number> = {
  "subscription.created": 1,
  "subscription.updated": 2,
  "subscription.activated": 2,
  "subscription.resumed": 2,
  "subscription.trialing": 2,
  "subscription.past_due": 2,
  "subscription.paused": 2,
  "transaction.completed": 2,
  "subscription.canceled": 3,
  "subscription.cancelled": 3,
};

export function billingEventTypeRank(eventType: string): number {
  return TYPE_RANK[eventType] ?? 2;
}

export function billingOccurredMs(occurredAt: string | null | undefined): number {
  if (!occurredAt) return 0;
  const ms = Date.parse(occurredAt);
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * Returns true when `incoming` should mutate canonical subscription state
 * relative to the last applied event.
 */
export function isBillingEventNewer(
  incoming: BillingEventRankInput,
  last: BillingEventRankInput | null,
): boolean {
  if (!last) return true;
  const inMs = billingOccurredMs(incoming.occurredAt);
  const lastMs = billingOccurredMs(last.occurredAt);
  if (inMs !== lastMs) return inMs > lastMs;
  const inRank = billingEventTypeRank(incoming.eventType);
  const lastRank = billingEventTypeRank(last.eventType);
  if (inRank !== lastRank) return inRank > lastRank;
  return incoming.eventId > last.eventId;
}
