import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "@/lib/logger";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

function captureLog(fn: () => void): Record<string, unknown> {
  vi.stubEnv("LOG_LEVEL", "debug");
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  fn();
  const line = (log.mock.calls[0]?.[0] ??
    warn.mock.calls[0]?.[0] ??
    error.mock.calls[0]?.[0]) as string;
  return JSON.parse(line) as Record<string, unknown>;
}

describe("logger", () => {
  it("emits structured JSON with ts/level/msg", () => {
    const record = captureLog(() => logger.info("hello", { foo: "bar" }));
    expect(record.level).toBe("info");
    expect(record.msg).toBe("hello");
    expect(record.foo).toBe("bar");
    expect(typeof record.ts).toBe("string");
  });

  it("redacts sensitive keys", () => {
    const record = captureLog(() =>
      logger.info("auth", {
        authorization: "Bearer secret",
        password: "hunter2",
        email: "user@example.com",
        nested: { access_token: "xyz", safe: "ok" },
      }),
    );
    expect(record.authorization).toBe("[redacted]");
    expect(record.password).toBe("[redacted]");
    expect(record.email).toBe("[redacted]");
    const nested = record.nested as Record<string, unknown>;
    expect(nested.access_token).toBe("[redacted]");
    expect(nested.safe).toBe("ok");
  });

  it("redacts ip/clientIp/ipAddress and nested forwarded headers", () => {
    const record = captureLog(() =>
      logger.warn("middleware rate limit exceeded", {
        ip: "203.0.113.9",
        clientIp: "198.51.100.7",
        ipAddress: "192.0.2.1",
        nested: {
          "x-forwarded-for": "10.0.0.1, 10.0.0.2",
          remoteIp: "172.16.0.4",
          tip: "keep",
        },
      }),
    );
    expect(record.ip).toBe("[redacted]");
    expect(record.clientIp).toBe("[redacted]");
    expect(record.ipAddress).toBe("[redacted]");
    const nested = record.nested as Record<string, unknown>;
    expect(nested["x-forwarded-for"]).toBe("[redacted]");
    expect(nested.remoteIp).toBe("[redacted]");
    expect(nested.tip).toBe("keep");
  });

  it("redacts cookies, JWTs, api keys, and truncates user-agent", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFBPVxLhYGA";
    const record = captureLog(() =>
      logger.info("req", {
        cookie: "sb-access-token=abc",
        refreshToken: "r1",
        apiKey: "k",
        session: "sess",
        authorization: "Bearer x",
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Extra/Info",
        bearer: jwt,
      }),
    );
    expect(record.cookie).toBe("[redacted]");
    expect(record.refreshToken).toBe("[redacted]");
    expect(record.apiKey).toBe("[redacted]");
    expect(record.session).toBe("[redacted]");
    expect(record.authorization).toBe("[redacted]");
    expect(record.bearer).toBe("[redacted]");
    expect(String(record.userAgent).length).toBeLessThanOrEqual(81);
    expect(String(record.userAgent)).not.toContain("Extra/Info");
  });

  it("does not treat pipeline/tip as IP keys", () => {
    const record = captureLog(() =>
      logger.info("safe", { pipeline: "etl", tip: "hydrate" }),
    );
    expect(record.pipeline).toBe("etl");
    expect(record.tip).toBe("hydrate");
  });

  it("partially masks long user ids", () => {
    const record = captureLog(() =>
      logger.info("event", {
        userId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    );
    expect(record.userId).toBe("550e…0000");
  });

  it("child loggers merge base context", () => {
    const record = captureLog(() =>
      logger.child({ requestId: "req-1" }).warn("child msg"),
    );
    expect(record.requestId).toBe("req-1");
    expect(record.level).toBe("warn");
  });

  it("suppresses logs below the active level", () => {
    vi.stubEnv("LOG_LEVEL", "error");
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("should not appear");
    expect(spy).not.toHaveBeenCalled();
  });
});
