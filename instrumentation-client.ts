import { sentryClientOptions } from "@/lib/sentry/options";

/**
 * Sentry browser SDK is ~100 KB gzip. Loading it eagerly put it in every
 * page's first-load JS (landing budget: 250 KB). It is loaded once the page is
 * idle instead, so it no longer competes with first paint.
 *
 * Errors thrown before it finishes loading are queued and reported once
 * Sentry is ready, so early failures are not lost.
 */
type SentryModule = typeof import("@sentry/nextjs");

let sentry: SentryModule | null = null;
const pendingErrors: unknown[] = [];

function queueError(event: ErrorEvent | PromiseRejectionEvent) {
  if (sentry) return;
  pendingErrors.push("reason" in event ? event.reason : (event.error ?? event.message));
}

function loadSentry() {
  import("@sentry/nextjs")
    .then((mod) => {
      mod.init(sentryClientOptions);
      sentry = mod;
      window.removeEventListener("error", queueError);
      window.removeEventListener("unhandledrejection", queueError);
      for (const error of pendingErrors.splice(0)) mod.captureException(error);
    })
    .catch(() => undefined);
}

if (typeof window !== "undefined") {
  window.addEventListener("error", queueError);
  window.addEventListener("unhandledrejection", queueError);
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(loadSentry, { timeout: 3000 });
  } else {
    setTimeout(loadSentry, 1500);
  }
}

export function onRouterTransitionStart(
  ...args: Parameters<SentryModule["captureRouterTransitionStart"]>
) {
  sentry?.captureRouterTransitionStart(...args);
}
