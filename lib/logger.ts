/**
 * Lightweight structured logger.
 *
 * Emits single-line JSON so logs are queryable in Vercel / any log drain, with
 * consistent fields (ts, level, msg, ...context). Sensitive keys are redacted
 * defensively. Use `logger.child({ requestId })` to correlate all logs for one
 * request; pair with `getRequestId()` inside route handlers.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const REDACT_KEYS = [
  "authorization",
  "cookie",
  "password",
  "token",
  "secret",
  "api_key",
  "apikey",
  "service_role",
  "access_token",
  "refresh_token",
  "email",
  "phone",
  "ip_address",
];

function activeLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL ?? "").toLowerCase();
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
    return raw;
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((v) => redact(v, depth + 1));
  }
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (REDACT_KEYS.some((k) => key.toLowerCase().includes(k))) {
      out[key] = "[redacted]";
    } else if (
      (key === "userId" || key === "user_id") &&
      typeof val === "string" &&
      val.length > 8
    ) {
      out[key] = `${val.slice(0, 4)}…${val.slice(-4)}`;
    } else {
      out[key] = redact(val, depth + 1);
    }
  }
  return out;
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
