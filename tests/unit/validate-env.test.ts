import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const { error, warn, info } = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error, warn, info, debug: vi.fn() },
}));

vi.mock("@/lib/supabase/env", () => ({
  getSupabasePublicEnv: vi.fn(() => ({})),
  getSupabaseServerEnv: vi.fn(() => ({})),
}));

import {
  CriticalEnvironmentError,
  validateEnvAtBoot,
} from "@/lib/startup/validate-env";

const CRITICAL_KEYS = [
  "CRON_SECRET",
  "CSRF_SECRET",
  "ADMIN_EMAIL",
  "ADMIN_HUB_PASSWORD",
  "ADMIN_HUB_SECRET",
  "PADDLE_NOTIFICATION_WEBHOOK_SECRET",
] as const;

describe("validateEnvAtBoot (OPS-001 / OPS-002)", () => {
  const original = { ...process.env };

  afterEach(() => {
    vi.unstubAllEnvs();
    process.env = { ...original };
  });

  beforeEach(() => {
    error.mockClear();
    warn.mockClear();
    info.mockClear();
    process.env = { ...original };
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    for (const key of CRITICAL_KEYS) {
      process.env[key] = `real-${key}`;
    }
    delete process.env.DAILY_CHEST_LIMIT_ENABLED;
  });

  it("reports each missing production secret as a critical error", () => {
    for (const key of CRITICAL_KEYS) {
      error.mockClear();
      process.env[key] = key === "ADMIN_HUB_PASSWORD" || key === "ADMIN_EMAIL" ? "" : "your_placeholder";
      expect(() => validateEnvAtBoot()).toThrow(CriticalEnvironmentError);
      expect(error).toHaveBeenCalled();
      const problems = error.mock.calls[0][1].problems as string[];
      expect(problems.some((p) => p.includes(key))).toBe(true);
      process.env[key] = `real-${key}`;
    }
  });

  it("reports DAILY_CHEST_LIMIT_ENABLED=false as critical (OPS-002)", () => {
    process.env.DAILY_CHEST_LIMIT_ENABLED = "false";
    expect(() => validateEnvAtBoot()).toThrow(CriticalEnvironmentError);
    const problems = error.mock.calls[0][1].problems as string[];
    expect(
      problems.some((p) => p.includes("DAILY_CHEST_LIMIT_ENABLED")),
    ).toBe(true);
  });

  it("does not log secret values", () => {
    process.env.CSRF_SECRET = "super-secret-value-xyz";
    delete process.env.CRON_SECRET;
    expect(() => validateEnvAtBoot()).toThrow(CriticalEnvironmentError);
    const serialized = JSON.stringify(error.mock.calls);
    expect(serialized).not.toContain("super-secret-value-xyz");
  });

  it("allows a fully configured production process to become ready", () => {
    expect(() => validateEnvAtBoot()).not.toThrow();
    expect(error).not.toHaveBeenCalled();
  });
});
