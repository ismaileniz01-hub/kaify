import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * In tests Upstash is unconfigured and NODE_ENV !== production, so the limiter
 * falls back to the in-memory fixed-window store. Verifies the core contract:
 * requests are allowed up to the limit, then denied, and the window resets.
 */
describe("checkRateLimit (in-memory fallback)", () => {
  const prevUrl = process.env.UPSTASH_REDIS_REST_URL;
  const prevToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    if (prevUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = prevUrl;
    if (prevToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = prevToken;
  });

  it("allows up to the limit then denies", async () => {
    const key = `test:${Math.random()}`;
    const config = { requests: 3, windowMs: 60_000 };

    const r1 = await checkRateLimit(key, config);
    const r2 = await checkRateLimit(key, config);
    const r3 = await checkRateLimit(key, config);
    const r4 = await checkRateLimit(key, config);

    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
  });

  it("resets after the window elapses", async () => {
    const key = `test:${Math.random()}`;
    const config = { requests: 1, windowMs: 1 };

    const first = await checkRateLimit(key, config);
    expect(first.allowed).toBe(true);

    await new Promise((r) => setTimeout(r, 5));

    const afterReset = await checkRateLimit(key, config);
    expect(afterReset.allowed).toBe(true);
  });

  it("failClosedInProduction denies when Upstash is missing in production", async () => {
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const result = await checkRateLimit(
      `test:failclosed:${Math.random()}`,
      { requests: 10, windowMs: 60_000 },
      { failClosedInProduction: true },
    );

    process.env.NODE_ENV = prevEnv;
    expect(result.allowed).toBe(false);
  });
});
