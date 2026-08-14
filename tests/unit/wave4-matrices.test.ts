import { describe, expect, it } from "vitest";
import {
  MUTATION_IDEMPOTENCY_MATRIX,
  unsafeRetryMutations,
} from "@/lib/reliability/mutation-matrix";
import { CRON_EXECUTION_MATRIX } from "@/lib/reliability/cron-matrix";
import { CRITICAL_TRANSACTION_MATRIX } from "@/lib/reliability/transaction-matrix";
import { MAX_JSON_BODY_ANALYZE, VERCEL_MAX_BODY_BYTES } from "@/lib/security/body-limit";

describe("Wave 4 reliability matrices", () => {
  it("has no retryable mutation that is unsafe if repeated", () => {
    expect(unsafeRetryMutations()).toEqual([]);
  });

  it("classifies every listed mutation as A, B, or C", () => {
    for (const row of MUTATION_IDEMPOTENCY_MATRIX) {
      expect(["A", "B", "C"]).toContain(row.class);
      if (row.retryable) {
        expect(row.class === "A" || row.class === "B" || row.safeIfRepeated).toBe(true);
      }
    }
  });

  it("has no UNSAFE cron jobs", () => {
    expect(CRON_EXECUTION_MATRIX.filter((c) => c.classification === "UNSAFE")).toEqual([]);
  });

  it("has no RISK transaction flows", () => {
    expect(CRITICAL_TRANSACTION_MATRIX.filter((t) => t.classification === "RISK")).toEqual([]);
  });

  it("keeps analyze body limit at or below the Vercel cap", () => {
    expect(MAX_JSON_BODY_ANALYZE).toBeLessThanOrEqual(VERCEL_MAX_BODY_BYTES);
    expect(VERCEL_MAX_BODY_BYTES).toBeLessThanOrEqual(4.5 * 1024 * 1024);
  });
});
