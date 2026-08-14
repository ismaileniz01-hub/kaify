/**
 * Minimal billing_events.payload — operational fields only.
 *
 * Full Paddle notifications can include customer email, address, and custom
 * data. Those are not required once paddle_customers / paddle_subscriptions
 * mirrors exist. Retention of the row itself follows docs/compliance/retention-policy.md
 * (7 years, tax/accounting) — this module only limits what is stored in jsonb.
 */

const ALLOWED_ROOT = new Set([
  "event_id",
  "event_type",
  "occurred_at",
  "notification_id",
]);

const ALLOWED_DATA = new Set([
  "id",
  "status",
  "currency_code",
  "collection_mode",
  "billing_cycle",
  "current_billing_period",
  "customer_id",
  "subscription_id",
  "transaction_id",
  "origin",
]);

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function pickAllowed(
  source: Record<string, unknown>,
  allowed: Set<string>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in source && source[key] !== undefined) {
      out[key] = source[key];
    }
  }
  return out;
}

export function minimizeBillingPayload(payload: unknown): Record<string, unknown> {
  const root = asRecord(payload);
  if (!root) return { minimized: true, unreadable: true };

  const data = asRecord(root.data);
  const items = Array.isArray(data?.items)
    ? data.items
        .map((item) => {
          const rec = asRecord(item);
          const price = asRecord(rec?.price);
          return {
            price_id: price?.id ?? rec?.price_id ?? null,
          };
        })
        .slice(0, 20)
    : undefined;

  return {
    minimized: true,
    ...pickAllowed(root, ALLOWED_ROOT),
    data: data
      ? {
          ...pickAllowed(data, ALLOWED_DATA),
          ...(items ? { items } : {}),
        }
      : undefined,
  };
}

export function billingPayloadContainsPii(payload: unknown): boolean {
  const text = JSON.stringify(payload ?? "").toLowerCase();
  if (text.includes("@") && text.includes("email")) return true;
  if (/"email"\s*:/.test(text)) return true;
  if (/"address"\s*:/.test(text)) return true;
  if (/"ip_address"\s*:/.test(text) || /"ip"\s*:/.test(text)) return true;
  return false;
}
