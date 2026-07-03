import * as Sentry from "@sentry/nextjs";
import { isSentryEnabled } from "@/lib/sentry/options";

type CaptureContext = {
  /** Per-request correlation id (mirrors the `X-Request-ID` response header). */
  requestId?: string | null;
  /** Stable error code (e.g. INTERNAL_ERROR) for grouping/filtering. */
  code?: string;
  /** Extra structured context attached to the Sentry event. */
  extra?: Record<string, unknown>;
};

/**
 * Reports an unexpected server error to Sentry (no-op when Sentry is not
 * configured). Tags the event with the request id and error code so an event
 * can be traced back to a specific log line and HTTP response.
 */
export function captureServerError(
  error: unknown,
  context: CaptureContext = {},
): void {
  if (!isSentryEnabled()) return;

  try {
    Sentry.withScope((scope) => {
      if (context.requestId) scope.setTag("request_id", context.requestId);
      if (context.code) scope.setTag("error_code", context.code);
      if (context.extra) scope.setContext("details", context.extra);
      Sentry.captureException(error);
    });
  } catch {
    // Never let observability failures affect the request path.
  }
}
