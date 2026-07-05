import type { BrowserOptions, EdgeOptions, NodeOptions } from "@sentry/nextjs";
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
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  enableLogs: true,
  sendDefaultPii: false,
  beforeSend: scrubSentryEvent,
  // Drop noise from client-side network hiccups and user-cancelled requests.
  ignoreErrors: [
    "AbortError",
    "The user aborted a request.",
    "NetworkError when attempting to fetch resource.",
    "Failed to fetch",
    "Load failed",
  ],
};

export const sentryClientOptions: BrowserOptions = {
  ...baseOptions,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
  integrations: (defaults) => defaults,
};

export const sentryServerOptions: NodeOptions = {
  ...baseOptions,
  includeLocalVariables: false,
};

export const sentryEdgeOptions: EdgeOptions = {
  ...baseOptions,
};
