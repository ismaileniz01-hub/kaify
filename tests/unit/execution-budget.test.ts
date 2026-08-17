import { describe, expect, it } from "vitest";
import {
  createExecutionBudget,
  runBatchedWithBudget,
} from "@/lib/cron/execution-budget";

describe("cron execution budget (REL-003)", () => {
  it("stops when the wall-clock budget is exhausted", async () => {
    const budget = createExecutionBudget(5);
    await new Promise((r) => setTimeout(r, 10));
    expect(budget.exhausted()).toBe(true);
    expect(budget.hasTimeFor(1)).toBe(false);
  });

  it("resumes from cursor across partial batches", async () => {
    const seen: Array<number | null> = [];
    let calls = 0;
    const first = await runBatchedWithBudget<number>({
      budget: createExecutionBudget(60_000),
      batchReserveMs: 0,
      initialCursor: null,
      runBatch: async (cursor) => {
        seen.push(cursor);
        calls += 1;
        if (calls === 1) {
          return { nextCursor: 1, processed: 1, done: false };
        }
        // Stop this invocation without completing the full table set.
        return { nextCursor: 1, processed: 1, done: true };
      },
    });
    expect(first.cursor).toBeNull();
    expect(first.complete).toBe(true);

    const resumed = await runBatchedWithBudget<number>({
      budget: createExecutionBudget(60_000),
      batchReserveMs: 0,
      initialCursor: 1,
      runBatch: async (cursor) => {
        seen.push(cursor);
        return { nextCursor: null, processed: 1, done: true };
      },
    });
    expect(resumed.complete).toBe(true);
    expect(seen).toContain(1);
  });

  it("stops mid-run when budget is exhausted and preserves cursor", async () => {
    const budget = createExecutionBudget(30);
    const result = await runBatchedWithBudget<number>({
      budget,
      batchReserveMs: 20,
      initialCursor: 0,
      runBatch: async (cursor) => {
        await new Promise((r) => setTimeout(r, 15));
        return {
          nextCursor: (cursor ?? 0) + 1,
          processed: 1,
          done: false,
        };
      },
    });
    expect(result.complete).toBe(false);
    expect(result.cursor).not.toBeNull();
    expect(result.batches).toBeGreaterThanOrEqual(1);
  });

  it("marks complete when producer signals done", async () => {
    const result = await runBatchedWithBudget<string>({
      budget: createExecutionBudget(60_000),
      initialCursor: null,
      runBatch: async () => ({
        nextCursor: null,
        processed: 3,
        done: true,
      }),
    });
    expect(result.complete).toBe(true);
    expect(result.processed).toBe(3);
    expect(result.batches).toBe(1);
  });

  it("cron routes have a 60s maxDuration override in vercel.json", () => {
    const { readFileSync } = require("node:fs") as typeof import("node:fs");
    const vercel = JSON.parse(readFileSync("vercel.json", "utf8")) as {
      functions: Record<string, { maxDuration: number }>;
    };
    expect(vercel.functions["app/api/cron/**/route.ts"].maxDuration).toBe(60);
    expect(vercel.functions["app/api/chat/**/route.ts"].maxDuration).toBe(60);
    expect(vercel.functions["app/api/v1/chat/**/route.ts"].maxDuration).toBe(60);
    expect(vercel.functions["app/api/profile/export/route.ts"].maxDuration).toBe(
      60,
    );
    expect(vercel.functions["app/api/**/route.ts"].maxDuration).toBe(10);
  });
});
