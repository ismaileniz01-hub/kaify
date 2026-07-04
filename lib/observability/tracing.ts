import * as Sentry from "@sentry/nextjs";
import { getRequestId } from "@/lib/api/request-context";
import { logger } from "@/lib/logger";

export type SpanMeta = Record<string, string | number | boolean | null | undefined>;

/**
 * Lightweight request-span helper — structured logs + Sentry breadcrumbs.
 * Not full OpenTelemetry; enough for correlation until OTel is wired.
 */
export async function withSpan<T>(
  name: string,
  fn: () => Promise<T>,
  meta?: SpanMeta,
): Promise<T> {
  const requestId = await getRequestId();
  const start = performance.now();

  Sentry.addBreadcrumb({
    category: "span",
    message: name,
    level: "info",
    data: { requestId: requestId ?? undefined, ...meta },
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
}
