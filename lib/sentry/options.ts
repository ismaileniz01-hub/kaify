import type { BrowserOptions, EdgeOptions, ErrorEvent, NodeOptions } from "@sentry/nextjs";
import { scrubSentryEvent } from "@/lib/sentry/scrub";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

export function isSentryEnabled(): boolean {
  return Boolean(dsn && dsn.length > 0 && !dsn.includes("your_"));
}

const baseOptions = {
  dsn,
  enabled: isSentryEnabled(),
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
  // Ties every event to the exact deploy so regressions are traceable.
  release: process.env.VERCEL_GIT_COMMIT_SHA ?? undefined,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1.0,
  enableLogs: false,
  sendDefaultPii: false,
  beforeSend(event: ErrorEvent) {
    const status = Number(
      (event.contexts as { response?: { status_code?: number } } | undefined)
        ?.response?.status_code,
    );
    if (status >= 400 && status < 500) return null;
    const message = `${event.message ?? ""} ${
      event.exception?.values?.map((value) => value.value ?? "").join(" ") ?? ""
    }`;
    if (
      /QUOTA_EXCEEDED|HTTP Client Error|status code:?\s*40[0139]/i.test(message)
    ) {
      return null;
    }
    return scrubSentryEvent(event);
  },
  // Drop noise from client-side network hiccups and user-cancelled requests.
  ignoreErrors: [
    "AbortError",
    "The user aborted a request.",
    "NetworkError when attempting to fetch resource.",
    "Failed to fetch",
    "Load failed",
    "ApiClientError",
  ],
};

export const sentryClientOptions: BrowserOptions = {
  ...baseOptions,
  // Replay ships a large client chunk — keep off for launch perf (errors still report).
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  integrations: (defaults) =>
    defaults.filter((integration) => {
      const name = integration.name;
      return (
        name !== "Replay" &&
        name !== "ReplayCanvas" &&
        name !== "HttpClient"
      );
    }),
};

export const sentryServerOptions: NodeOptions = {
  ...baseOptions,
  includeLocalVariables: false,
};

export const sentryEdgeOptions: EdgeOptions = {
  ...baseOptions,
};
