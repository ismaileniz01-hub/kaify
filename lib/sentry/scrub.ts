import type { ErrorEvent, EventHint } from "@sentry/nextjs";

const EMAIL_IN_TEXT = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/** Strips PII from Sentry events before upload (Compliance Faz 3). */
export function scrubSentryEvent<T extends ErrorEvent>(event: T, _hint?: EventHint): T {
  if (event.user) {
    delete event.user.email;
    delete event.user.username;
    delete event.user.ip_address;
  }

  if (event.request?.cookies) {
    delete event.request.cookies;
  }
  if (event.request?.headers) {
    delete event.request.headers.authorization;
    delete event.request.headers.cookie;
  }

  if (typeof event.message === "string") {
    event.message = event.message.replace(EMAIL_IN_TEXT, "[email redacted]");
  }

  return event;
}
