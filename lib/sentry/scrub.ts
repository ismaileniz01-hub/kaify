import type { ErrorEvent } from "@sentry/nextjs";

const EMAIL_IN_TEXT = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const BEARER_IN_TEXT = /Bearer\s+[A-Za-z0-9._\-]+/gi;
const SENSITIVE_KEYS =
  /^(authorization|cookie|password|token|secret|api[_-]?key|email|phone)$/i;

function redactText(value: string): string {
  return value
    .replace(EMAIL_IN_TEXT, "[email redacted]")
    .replace(BEARER_IN_TEXT, "Bearer [redacted]");
}

/** Sync FNV-1a — works in browser, Edge, and Node (no node:crypto). */
export function hashUserId(id: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function scrubValue(value: unknown, depth = 0): unknown {
  if (depth > 6 || value == null) return value;
  if (typeof value === "string") return redactText(value);
  if (Array.isArray(value)) return value.map((item) => scrubValue(item, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.test(key)) {
        out[key] = "[redacted]";
        continue;
      }
      out[key] = scrubValue(nested, depth + 1);
    }
    return out;
  }
  return value;
}

/** Strips PII from Sentry events before upload. */
export function scrubSentryEvent<T extends ErrorEvent>(event: T): T {
  if (event.user) {
    if (typeof event.user.id === "string" && event.user.id) {
      event.user.id = hashUserId(event.user.id);
    }
    delete event.user.email;
    delete event.user.username;
    delete event.user.ip_address;
  }

  if (event.request) {
    if (event.request.cookies) delete event.request.cookies;
    if (event.request.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.cookie;
      delete event.request.headers.Authorization;
      delete event.request.headers.Cookie;
    }
    if (event.request.data !== undefined) {
      event.request.data = scrubValue(event.request.data) as typeof event.request.data;
    }
    if (typeof event.request.query_string === "string") {
      event.request.query_string = redactText(event.request.query_string);
    }
  }

  if (typeof event.message === "string") {
    event.message = redactText(event.message);
  }

  if (event.extra) {
    event.extra = scrubValue(event.extra) as typeof event.extra;
  }

  if (event.contexts) {
    event.contexts = scrubValue(event.contexts) as typeof event.contexts;
  }

  if (Array.isArray(event.breadcrumbs)) {
    event.breadcrumbs = event.breadcrumbs.map((crumb) => {
      const next = { ...crumb };
      if (typeof next.message === "string") next.message = redactText(next.message);
      if (next.data) next.data = scrubValue(next.data) as typeof next.data;
      return next;
    });
  }

  return event;
}
