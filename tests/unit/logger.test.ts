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
    expect((record.nested as Record<string, unknown>).access_token).toBe(
      "[redacted]",
    );
    expect((record.nested as Record<string, unknown>).safe).toBe("ok");
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
