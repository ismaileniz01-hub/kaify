export type SpanMeta = Record<string, string | number | boolean | null | undefined>;

/** Pure attribute builder for Sentry spans (TD-001 / ADR 017). */
export function toSpanAttributes(
  meta: SpanMeta | undefined,
  requestId: string | null,
): Record<string, string | number | boolean> {
  const attrs: Record<string, string | number | boolean> = {};
  if (requestId) attrs["request.id"] = requestId;
  if (!meta) return attrs;
  for (const [key, value] of Object.entries(meta)) {
    if (value === null || value === undefined) continue;
    attrs[key] = value;
  }
  return attrs;
}
