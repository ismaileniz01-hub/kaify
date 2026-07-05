/**
 * Domain event types for critical business operations (Architecture Faz 2).
 * Today: structured audit log. Future: persist to outbox table for async workers.
 */

export type DomainEventType =
  | "account.deleted"
  | "account.exported"
  | "check_in.completed"
  | "market.purchased"
  | "billing.webhook.received"
  | "consent.granted"
  | "consent.revoked";

export type DomainEvent = {
  type: DomainEventType;
  aggregateId: string;
  userId?: string;
  payload?: Record<string, unknown>;
  occurredAt: string;
};

export function createDomainEvent(
  type: DomainEventType,
  aggregateId: string,
  payload?: Record<string, unknown>,
  userId?: string,
): DomainEvent {
  return {
    type,
    aggregateId,
    userId,
    payload,
    occurredAt: new Date().toISOString(),
  };
}
