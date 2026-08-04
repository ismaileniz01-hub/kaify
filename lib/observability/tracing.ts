import * as Sentry from "@sentry/nextjs";
import { getRequestId } from "@/lib/api/request-context";
import { logger } from "@/lib/logger";

export type SpanMeta = Record<string, string | number | boolean | null | undefined>;

function toSpanAttributes(
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

/**
 * Lightweight request-span helper — Sentry performance span + structured logs.
 * Full OpenTelemetry SDK remains TD-001; this preserves the `withSpan` API
 * and exports to Sentry until OTel is wired (ADR 017).
 */
export async function withSpan<T>(
  name: string,
  fn: () => Promise<T>,
  meta?: SpanMeta,
): Promise<T> {
  const requestId = await getRequestId();
  const attributes = toSpanAttributes(meta, requestId);

  return Sentry.startSpan(
    {
      name,
      op: "http.server",
      attributes,
    },
    async () => {
      const start = performance.now();

      Sentry.addBreadcrumb({
        category: "span",
        message: name,
        level: "info",
        data: attributes,
      });

      try {
        const result = await fn();
        const ms = Math.round(performance.now() - start);
        logger.debug("span ok", { span: name, ms, requestId, ...meta });
        return result;
      } catch (error) {
        const ms = Math.round(performance.now() - start);
        logger.warn("span error", {
          span: name,
          ms,
          requestId,
          error: error instanceof Error ? error.message : "unknown",
          ...meta,
        });
        throw error;
      }
    },
  );
}
