/**
 * Lightweight structured logger.
 *
 * Emits single-line JSON so logs are queryable in Vercel / any log drain, with
 * consistent fields (ts, level, msg, ...context). Sensitive keys are redacted
 * defensively. Use `logger.child({ requestId })` to correlate all logs for one
 * request; pair with `getRequestId()` inside route handlers.
 *
 * Redaction is exact-key (normalized) plus value-shape checks. Substring
 * matching is intentionally avoided so keys like `tip` / `pipeline` survive.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const REDACTED = "[redacted]";
const MAX_DEPTH = 8;
const MAX_UA_CHARS = 80;

/** Normalized (lowercase, no `_`/`-`) keys that must never be logged in plaintext. */
const EXACT_REDACT_KEYS = new Set([
  "authorization",
  "cookie",
  "cookies",
  "password",
  "passwd",
  "secret",
  "clientsecret",
  "token",
  "accesstoken",
  "refreshtoken",
  "idtoken",
  "session",
  "sessionid",
  "apikey",
  "apisecret",
  "servicerole",
  "privatekey",
  "email",
  "emailaddress",
  "phone",
  "phonenumber",
  "ip",
  "clientip",
  "ipaddress",
  "remoteip",
  "forwardedfor",
  "xforwardedfor",
  "xrealip",
  "cfconnectingip",
  "jwt",
]);

const REDACT_KEY_SUFFIXES = [
  "token",
  "secret",
  "password",
  "authorization",
  "apikey",
  "cookie",
] as const;

const JWT_VALUE = /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[_-]/g, "");
}

function isSensitiveKey(key: string): boolean {
  const n = normalizeKey(key);
  if (EXACT_REDACT_KEYS.has(n)) return true;
  if (n.includes("xforwardedfor") || n.includes("forwardedfor")) return true;
  return REDACT_KEY_SUFFIXES.some((suffix) => n.endsWith(suffix));
}

function isUserAgentKey(key: string): boolean {
  const n = normalizeKey(key);
  return n === "useragent" || n === "ua";
}

function looksLikeJwt(value: string): boolean {
  return value.length > 40 && JWT_VALUE.test(value.trim());
}

function truncateUserAgent(value: string): string {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= MAX_UA_CHARS) return compact;
  return `${compact.slice(0, MAX_UA_CHARS)}…`;
}

function maskUserId(val: string): string {
  if (val.length <= 8) return val;
  return `${val.slice(0, 4)}…${val.slice(-4)}`;
}

export function redact(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH || value === null || typeof value !== "object") {
    if (typeof value === "string" && looksLikeJwt(value)) return REDACTED;
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((v) => redact(v, depth + 1));
  }
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (isSensitiveKey(key)) {
      out[key] = REDACTED;
      continue;
    }
    if (isUserAgentKey(key) && typeof val === "string") {
      out[key] = truncateUserAgent(val);
      continue;
    }
    if (
      (key === "userId" || key === "user_id") &&
      typeof val === "string" &&
      val.length > 8
    ) {
      out[key] = maskUserId(val);
      continue;
    }
    if (typeof val === "string" && looksLikeJwt(val)) {
      out[key] = REDACTED;
      continue;
    }
    out[key] = redact(val, depth + 1);
  }
  return out;
}

function activeLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL ?? "").toLowerCase();
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
    return raw;
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

export type LogContext = Record<string, unknown>;

class Logger {
  private readonly base: LogContext;

  constructor(base: LogContext = {}) {
    this.base = base;
  }

  child(context: LogContext): Logger {
    return new Logger({ ...this.base, ...context });
  }

  private write(level: LogLevel, msg: string, context?: LogContext): void {
    if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[activeLevel()]) return;

    const record = {
      ts: new Date().toISOString(),
      level,
      msg,
      ...(redact({ ...this.base, ...context }) as LogContext),
    };

    const line = JSON.stringify(record);
    if (level === "error") {
      console.error(line);
    } else if (level === "warn") {
      console.warn(line);
    } else {
      console.log(line);
    }
  }

  debug(msg: string, context?: LogContext): void {
    this.write("debug", msg, context);
  }
  info(msg: string, context?: LogContext): void {
    this.write("info", msg, context);
  }
  warn(msg: string, context?: LogContext): void {
    this.write("warn", msg, context);
  }
  error(msg: string, context?: LogContext): void {
    this.write("error", msg, context);
  }
}

export const logger = new Logger();
