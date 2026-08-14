/**
 * Bounded cron execution helpers — explicit wall-clock budget + cursor resume.
 * Prevents whole-user-base jobs from silently truncating under serverless caps.
 */

export type ExecutionBudget = {
  readonly startedAt: number;
  readonly maxMs: number;
  remainingMs: () => number;
  hasTimeFor: (estimatedMs: number) => boolean;
  exhausted: () => boolean;
};

export function createExecutionBudget(maxMs: number): ExecutionBudget {
  const startedAt = Date.now();
  return {
    startedAt,
    maxMs,
    remainingMs: () => Math.max(0, maxMs - (Date.now() - startedAt)),
    hasTimeFor: (estimatedMs: number) =>
      Date.now() - startedAt + estimatedMs < maxMs,
    exhausted: () => Date.now() - startedAt >= maxMs,
  };
}

export type CursorCheckpoint<T> = {
  cursor: T | null;
  complete: boolean;
  batches: number;
  processed: number;
};

/**
 * Runs keyed batches until the budget is exhausted or the producer signals done.
 * Safe to re-invoke: callers persist `cursor` between runs for resume.
 */
export async function runBatchedWithBudget<TCursor>(options: {
  budget: ExecutionBudget;
  /** Estimated cost of one batch — used to stop before hard timeout. */
  batchReserveMs?: number;
  initialCursor: TCursor | null;
  runBatch: (cursor: TCursor | null) => Promise<{
    nextCursor: TCursor | null;
    processed: number;
    done: boolean;
  }>;
}): Promise<CursorCheckpoint<TCursor>> {
  const reserve = options.batchReserveMs ?? 1_500;
  let cursor = options.initialCursor;
  let batches = 0;
  let processed = 0;
  let complete = false;

  while (options.budget.hasTimeFor(reserve)) {
    const result = await options.runBatch(cursor);
    batches += 1;
    processed += result.processed;
    cursor = result.nextCursor;
    if (result.done) {
      complete = true;
      cursor = null;
      break;
    }
  }

  return { cursor, complete, batches, processed };
}
