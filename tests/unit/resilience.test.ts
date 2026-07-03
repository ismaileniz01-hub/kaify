import { describe, it, expect, beforeEach } from "vitest";
import {
  classifyStatus,
  classifyError,
  isRetryable,
  UpstreamHttpError,
} from "@/lib/resilience/error-taxonomy";
import { withRetry } from "@/lib/resilience/retry";
import {
  withCircuit,
  CircuitOpenError,
  getCircuitSnapshots,
  resetCircuit,
  __resetAllCircuits,
} from "@/lib/resilience/circuit";
import { resilient } from "@/lib/resilience";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("error-taxonomy", () => {
  it("marks upstream 5xx as retryable", () => {
    for (const s of [500, 502, 503, 504]) {
      expect(classifyStatus(s).category).toBe("upstream");
      expect(classifyStatus(s).retryable).toBe(true);
    }
  });

  it("marks 408/425/429 as retryable rate_limit", () => {
    for (const s of [408, 425, 429]) {
      expect(classifyStatus(s).category).toBe("rate_limit");
      expect(classifyStatus(s).retryable).toBe(true);
    }
  });

  it("marks client/auth/501 as non-retryable", () => {
    expect(classifyStatus(400).category).toBe("client");
    expect(classifyStatus(404).category).toBe("client");
    expect(classifyStatus(409).retryable).toBe(false);
    expect(classifyStatus(401).category).toBe("auth");
    expect(classifyStatus(403).category).toBe("auth");
    expect(classifyStatus(501).category).toBe("not_implemented");
    expect(classifyStatus(501).retryable).toBe(false);
  });

  it("classifies UpstreamHttpError by its status", () => {
    expect(classifyError(new UpstreamHttpError(503)).retryable).toBe(true);
    expect(classifyError(new UpstreamHttpError(403)).category).toBe("auth");
  });

  it("classifies objects exposing a numeric status (ApiError-like)", () => {
    expect(classifyError({ status: 500 }).retryable).toBe(true);
    expect(classifyError({ status: 409 }).category).toBe("client");
  });

  it("duck-types AiError codes", () => {
    expect(classifyError({ code: "AI_TIMEOUT" }).category).toBe("transient");
    expect(classifyError({ code: "AI_UPSTREAM" }).category).toBe("upstream");
    expect(classifyError({ code: "AI_BAD_OUTPUT" }).retryable).toBe(false);
    expect(classifyError({ code: "AI_LOW_QUALITY" }).retryable).toBe(false);
  });

  it("treats network/timeout messages as transient", () => {
    expect(isRetryable(new Error("fetch failed"))).toBe(true);
    expect(isRetryable(new Error("connection ETIMEDOUT"))).toBe(true);
    expect(isRetryable(new Error("socket hang up"))).toBe(true);
  });

  it("defaults unknown errors to fatal (non-retryable)", () => {
    expect(classifyError(new Error("boom")).category).toBe("fatal");
    expect(isRetryable("weird")).toBe(false);
    expect(isRetryable(null)).toBe(false);
  });

  it("availability failures count toward the circuit; others do not", () => {
    expect(classifyStatus(503).countsTowardCircuit).toBe(true);
    expect(classifyStatus(429).countsTowardCircuit).toBe(true);
    expect(classifyStatus(400).countsTowardCircuit).toBe(false);
    expect(classifyStatus(401).countsTowardCircuit).toBe(false);
  });
});

describe("withRetry", () => {
  it("retries transient failures until success", async () => {
    let calls = 0;
    const res = await withRetry(
      async () => {
        calls += 1;
        if (calls < 3) throw new UpstreamHttpError(503);
        return "ok";
      },
      { retries: 3, baseDelayMs: 0, jitter: false },
    );
    expect(res).toBe("ok");
    expect(calls).toBe(3);
  });

  it("does not retry non-retryable errors", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          throw new UpstreamHttpError(400);
        },
        { retries: 3, baseDelayMs: 0, jitter: false },
      ),
    ).rejects.toBeInstanceOf(UpstreamHttpError);
    expect(calls).toBe(1);
  });

  it("respects the retry ceiling (1 + retries attempts)", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          throw new UpstreamHttpError(503);
        },
        { retries: 2, baseDelayMs: 0, jitter: false },
      ),
    ).rejects.toBeTruthy();
    expect(calls).toBe(3);
  });

  it("stops immediately when the signal is already aborted", async () => {
    const ac = new AbortController();
    ac.abort();
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          throw new UpstreamHttpError(503);
        },
        { retries: 3, baseDelayMs: 0, jitter: false, signal: ac.signal },
      ),
    ).rejects.toBeTruthy();
    expect(calls).toBe(1);
  });
});

describe("withCircuit", () => {
  beforeEach(() => __resetAllCircuits());

  it("opens after the threshold and then fails fast", async () => {
    const opts = { threshold: 2, cooldownMs: 50 };
    const boom = () =>
      withCircuit("c1", async () => {
        throw new UpstreamHttpError(503);
      }, opts);

    await expect(boom()).rejects.toBeInstanceOf(UpstreamHttpError);
    await expect(boom()).rejects.toBeInstanceOf(UpstreamHttpError);
    await expect(
      withCircuit("c1", async () => "unreachable", opts),
    ).rejects.toBeInstanceOf(CircuitOpenError);

    expect(getCircuitSnapshots().find((s) => s.name === "c1")?.open).toBe(true);
  });

  it("half-opens after cooldown and closes on a successful probe", async () => {
    const opts = { threshold: 1, cooldownMs: 30 };
    await expect(
      withCircuit("c2", async () => {
        throw new UpstreamHttpError(503);
      }, opts),
    ).rejects.toBeTruthy();
    await expect(
      withCircuit("c2", async () => "x", opts),
    ).rejects.toBeInstanceOf(CircuitOpenError);

    await wait(45);
    expect(await withCircuit("c2", async () => "recovered", opts)).toBe(
      "recovered",
    );
    expect(getCircuitSnapshots().find((s) => s.name === "c2")?.open).toBe(false);
  });

  it("re-opens when the half-open probe fails", async () => {
    const opts = { threshold: 1, cooldownMs: 30 };
    await expect(
      withCircuit("c3", async () => {
        throw new UpstreamHttpError(503);
      }, opts),
    ).rejects.toBeTruthy();

    await wait(45);
    await expect(
      withCircuit("c3", async () => {
        throw new UpstreamHttpError(503);
      }, opts),
    ).rejects.toBeInstanceOf(UpstreamHttpError);

    await expect(
      withCircuit("c3", async () => "x", opts),
    ).rejects.toBeInstanceOf(CircuitOpenError);
  });

  it("does not trip on non-availability errors", async () => {
    const opts = { threshold: 1, cooldownMs: 50 };
    const boom = () =>
      withCircuit("c4", async () => {
        throw new UpstreamHttpError(400);
      }, opts);

    await expect(boom()).rejects.toBeTruthy();
    await expect(boom()).rejects.toBeTruthy();

    const snap = getCircuitSnapshots().find((s) => s.name === "c4");
    expect(snap?.open).toBe(false);
    expect(snap?.failures).toBe(0);
  });

  it("resetCircuit clears breaker state", async () => {
    const opts = { threshold: 1, cooldownMs: 1000 };
    await expect(
      withCircuit("c5", async () => {
        throw new UpstreamHttpError(503);
      }, opts),
    ).rejects.toBeTruthy();
    resetCircuit("c5");
    expect(await withCircuit("c5", async () => "ok", opts)).toBe("ok");
  });
});

describe("resilient", () => {
  beforeEach(() => __resetAllCircuits());

  it("retries then succeeds", async () => {
    let calls = 0;
    const res = await resilient(
      "r1",
      async () => {
        calls += 1;
        if (calls < 2) throw new UpstreamHttpError(503);
        return "done";
      },
      { retries: 3, baseDelayMs: 0 },
    );
    expect(res).toBe("done");
    expect(calls).toBe(2);
  });

  it("falls back after exhausting retries", async () => {
    const res = await resilient<string>(
      "r2",
      async () => {
        throw new UpstreamHttpError(503);
      },
      { retries: 1, baseDelayMs: 0, threshold: 99, fallback: () => "cached" },
    );
    expect(res).toBe("cached");
  });

  it("falls back immediately when the circuit is open", async () => {
    const opts = { retries: 0, baseDelayMs: 0, threshold: 1, cooldownMs: 1000 };
    await expect(
      resilient("r3", async () => {
        throw new UpstreamHttpError(503);
      }, opts),
    ).rejects.toBeTruthy();

    const res = await resilient<string>("r3", async () => "live", {
      ...opts,
      fallback: () => "stale",
    });
    expect(res).toBe("stale");
  });

  it("does not retry client errors", async () => {
    let calls = 0;
    await expect(
      resilient(
        "r4",
        async () => {
          calls += 1;
          throw new UpstreamHttpError(400);
        },
        { retries: 3, baseDelayMs: 0, threshold: 99 },
      ),
    ).rejects.toBeTruthy();
    expect(calls).toBe(1);
  });
});
