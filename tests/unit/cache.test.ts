import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cacheGet, cacheSet, cached } from "@/lib/cache";

/**
 * In the test environment Upstash is not configured, so the cache is a no-op
 * that must fail open: reads return null, writes are silently skipped, and
 * `cached()` always falls through to the producer without ever throwing on
 * cache errors.
 */
describe("cache (fail-open, unconfigured)", () => {
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
    vi.restoreAllMocks();
  });

  it("cacheGet returns null when unconfigured", async () => {
    await expect(cacheGet("any:key")).resolves.toBeNull();
  });

  it("cacheSet is a no-op that never throws", async () => {
    await expect(cacheSet("any:key", { a: 1 }, 60)).resolves.toBeUndefined();
  });

  it("cached() runs the producer and returns its value", async () => {
    const producer = vi.fn().mockResolvedValue({ value: 42 });
    const result = await cached("k", 60, producer);
    expect(result).toEqual({ value: 42 });
    expect(producer).toHaveBeenCalledTimes(1);
  });

  it("cached() propagates producer errors and never caches them", async () => {
    const producer = vi.fn().mockRejectedValue(new Error("boom"));
    await expect(cached("k", 60, producer)).rejects.toThrow("boom");
  });

  it("placeholder env values are treated as unconfigured", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "your_url_here";
    process.env.UPSTASH_REDIS_REST_TOKEN = "your_token_here";
    await expect(cacheGet("k")).resolves.toBeNull();
  });
});
