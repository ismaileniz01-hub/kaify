/**
 * Extract subscription period end from a Paddle webhook/API payload.
 * Prefers current_billing_period.ends_at, then next_billed_at.
 */
export function parsePaddleExpiresAt(
  data: Record<string, unknown>,
): string | null {
  const period = asRecord(
    data.currentBillingPeriod ?? data.current_billing_period,
  );
  const endsAt = pickString(period?.endsAt, period?.ends_at);
  if (endsAt) {
    const ms = Date.parse(endsAt);
    if (Number.isFinite(ms)) return new Date(ms).toISOString();
  }

  const nextBilled = pickString(data.nextBilledAt, data.next_billed_at);
  if (nextBilled) {
    const ms = Date.parse(nextBilled);
    if (Number.isFinite(ms)) return new Date(ms).toISOString();
  }

  return null;
}

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
