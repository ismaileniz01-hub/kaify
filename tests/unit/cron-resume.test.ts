import { describe, expect, it } from "vitest";
import {
  createExecutionBudget,
  runBatchedWithBudget,
} from "@/lib/cron/execution-budget";

describe("cron resumability", () => {
  it("stops when the budget is exhausted and resumes from cursor", async () => {
    const seen: number[] = [];
    const first = await runBatchedWithBudget<number>({
      budget: createExecutionBudget(5),
      batchReserveMs: 20,
      initialCursor: 0,
      runBatch: async (cursor) => {
        const n = cursor ?? 0;
        seen.push(n);
        await new Promise((r) => setTimeout(r, 15));
        return { nextCursor: n + 1, processed: 1, done: n >= 20 };
      },
    });
    expect(first.complete).toBe(false);
    expect(first.cursor).not.toBeNull();

    const second = await runBatchedWithBudget<number>({
      budget: createExecutionBudget(60_000),
      batchReserveMs: 1,
      initialCursor: first.cursor,
      runBatch: async (cursor) => {
        const n = cursor ?? 0;
        seen.push(n);
        if (n >= 3) return { nextCursor: null, processed: 1, done: true };
        return { nextCursor: n + 1, processed: 1, done: false };
      },
    });
    expect(second.complete).toBe(true);
    expect(seen[0]).toBe(0);
    expect(new Set(seen).size).toBe(seen.length);
  });
});
