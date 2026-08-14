import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { UpstreamHttpError } from "@/lib/resilience/error-taxonomy";
import {
  CircuitOpenError,
  withCircuit,
  __resetAllCircuits,
  __setCircuitSharedDisabled,
  __setCircuitSharedStore,
  type CircuitSharedStore,
} from "@/lib/resilience/circuit";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function memoryStore(): CircuitSharedStore & { map: Map<string, unknown> } {
  const map = new Map<string, unknown>();
  return {
    map,
    async get(key) {
      return (map.get(key) as never) ?? null;
    },
    async set(key, value) {
      map.set(key, value);
    },
    async del(key) {
      map.delete(key);
    },
    async setNx(key, _ttl) {
      if (map.has(key)) return false;
      map.set(key, "1");
      return true;
    },
  };
}

describe("distributed circuit breaker", () => {
  beforeEach(() => {
    __resetAllCircuits();
    __setCircuitSharedStore(null);
    __setCircuitSharedDisabled(false);
  });

  afterEach(() => {
    __resetAllCircuits();
    __setCircuitSharedStore(null);
  });

  it("closed → failures → open → short-circuit", async () => {
    const opts = { threshold: 2, cooldownMs: 200 };
    let calls = 0;
    const boom = () =>
      withCircuit("prov", async () => {
        calls += 1;
        throw new UpstreamHttpError(503);
      }, opts);

    await expect(boom()).rejects.toBeInstanceOf(UpstreamHttpError);
    await expect(boom()).rejects.toBeInstanceOf(UpstreamHttpError);
    await expect(withCircuit("prov", async () => "no", opts)).rejects.toBeInstanceOf(
      CircuitOpenError,
    );
    expect(calls).toBe(2);
  });

  it("shares open state across simulated instances", async () => {
    const shared = memoryStore();
    __setCircuitSharedStore(shared);
    const opts = { threshold: 1, cooldownMs: 5_000 };

    await expect(
      withCircuit("deepseek", async () => {
        throw new UpstreamHttpError(503);
      }, opts),
    ).rejects.toBeTruthy();

    __resetAllCircuits();
    __setCircuitSharedStore(shared);

    let calls = 0;
    await expect(
      withCircuit("deepseek", async () => {
        calls += 1;
        return "live";
      }, opts),
    ).rejects.toBeInstanceOf(CircuitOpenError);
    expect(calls).toBe(0);
  });

  it("half-open probe stampede: only one SET NX winner calls the provider", async () => {
    const shared = memoryStore();
    __setCircuitSharedStore(shared);
    const opts = { threshold: 1, cooldownMs: 40 };

    await expect(
      withCircuit("gemini", async () => {
        throw new UpstreamHttpError(503);
      }, opts),
    ).rejects.toBeTruthy();

    await wait(50);

    let probes = 0;
    const slowProbe = () =>
      withCircuit("gemini", async () => {
        probes += 1;
        await wait(30);
        return "ok";
      }, opts);

    const results = await Promise.allSettled([slowProbe(), slowProbe(), slowProbe()]);
    const rejected = results.filter((r) => r.status === "rejected").length;
    expect(probes).toBe(1);
    expect(rejected).toBeGreaterThanOrEqual(2);
  });

  it("Redis unavailable degrades to local breaker", async () => {
    __setCircuitSharedDisabled(true);
    const opts = { threshold: 1, cooldownMs: 200 };
    await expect(
      withCircuit("local", async () => {
        throw new UpstreamHttpError(503);
      }, opts),
    ).rejects.toBeTruthy();
    await expect(withCircuit("local", async () => "x", opts)).rejects.toBeInstanceOf(
      CircuitOpenError,
    );
  });

  it("recovers after successful half-open probe", async () => {
    const shared = memoryStore();
    __setCircuitSharedStore(shared);
    const opts = { threshold: 1, cooldownMs: 30 };
    await expect(
      withCircuit("ok", async () => {
        throw new UpstreamHttpError(503);
      }, opts),
    ).rejects.toBeTruthy();
    await wait(40);
    expect(await withCircuit("ok", async () => "recovered", opts)).toBe("recovered");
    expect(await withCircuit("ok", async () => "still", opts)).toBe("still");
  });
});
