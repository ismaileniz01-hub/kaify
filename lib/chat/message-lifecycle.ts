export type MessageDeliveryStatus = "sending" | "delivered" | "failed";

type MessageWithDelivery = {
  id: string;
  status?: MessageDeliveryStatus;
  idempotencyKey?: string;
};

/** Mark a message as failed (keeps bubble; clears sending). */
export function markMessageFailed<T extends MessageWithDelivery>(
  messages: T[],
  messageId: string,
): T[] {
  return messages.map((msg) =>
    msg.id === messageId ? { ...msg, status: "failed" as const } : msg,
  );
}

/** Mark a message as delivered after a successful send. */
export function markMessageDelivered<T extends MessageWithDelivery>(
  messages: T[],
  messageId: string,
): T[] {
  return messages.map((msg) =>
    msg.id === messageId ? { ...msg, status: "delivered" as const } : msg,
  );
}

/**
 * Retry must reuse the same idempotency key when the failed message still has one.
 * Creating a new key would risk duplicate server-side writes.
 */
export function shouldReuseIdempotencyKeyOnRetry(
  status: MessageDeliveryStatus | undefined,
  idempotencyKey: string | undefined,
): idempotencyKey is string {
  return status === "failed" && typeof idempotencyKey === "string" && idempotencyKey.length > 0;
}
