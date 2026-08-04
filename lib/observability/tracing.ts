import * as Sentry from "@sentry/nextjs";
import { getRequestId } from "@/lib/api/request-context";
import { logger } from "@/lib/logger";
import {
  toSpanAttributes,
  type SpanMeta,
} from "@/lib/observability/to-span-attributes";

export type { SpanMeta } from "@/lib/observability/to-span-attributes";

/**
 * Lightweight request-span helper — Sentry performance span + structured logs.
 * Full OpenTelemetry SDK is optional backlog; Sentry spans satisfy TD-001 (ADR 017).
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
