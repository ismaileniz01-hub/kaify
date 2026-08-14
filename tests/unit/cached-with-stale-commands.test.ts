import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cachedWithStale } from "@/lib/cache";

describe("cachedWithStale Redis commands (PERF-006)", () => {
  const prevUrl = process.env.UPSTASH_REDIS_REST_URL;
  const prevToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  let commands: string[][];
  let store: Map<string, string>;

  beforeEach(() => {
    commands = [];
    store = new Map();
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token-not-placeholder";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: { body?: string }) => {
        const cmd = JSON.parse(String(init?.body ?? "[]")) as string[];
        commands.push(cmd);
        const op = cmd[0];
        if (op === "GET") {
          return {
            ok: true,
            json: async () => ({ result: store.get(cmd[1]) ?? null }),
          };
        }
        if (op === "SET") {
          store.set(cmd[1], cmd[2]);
          return { ok: true, json: async () => ({ result: "OK" }) };
        }
        return { ok: true, json: async () => ({ result: null }) };
      }),
    );
  });

  afterEach(() => {
    if (prevUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = prevUrl;
    if (prevToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = prevToken;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("cache miss writes fresh + stale once", async () => {
    const producer = vi.fn().mockResolvedValue({ n: 1 });
    await cachedWithStale("k", 60, 3600, producer);
    expect(producer).toHaveBeenCalledTimes(1);
    const sets = commands.filter((c) => c[0] === "SET");
    expect(sets.map((c) => c[1]).sort()).toEqual(["k", "k:stale"]);
  });

  it("fresh hit does not rewrite the stale companion", async () => {
    const producer = vi.fn().mockResolvedValue({ n: 1 });
    await cachedWithStale("k", 60, 3600, producer);
    const afterMiss = commands.length;
    producer.mockClear();
    await cachedWithStale("k", 60, 3600, producer);
    expect(producer).not.toHaveBeenCalled();
    const newCmds = commands.slice(afterMiss);
    expect(newCmds.filter((c) => c[0] === "SET")).toHaveLength(0);
    expect(newCmds.filter((c) => c[0] === "GET")).toHaveLength(1);
  });
});
