import { describe, expect, it } from "vitest";
import { hashRequest } from "@/lib/api/idempotency-store";

/**
 * The request hash is what lets the idempotency layer reject a reused key that
 * carries a different payload. Its integrity properties:
 *  - deterministic for the same (endpoint, body)
 *  - sensitive to endpoint AND body changes
 *  - stable treatment of null/undefined bodies (both hash the same)
 */
describe("hashRequest", () => {
  it("is deterministic for identical inputs", () => {
    const a = hashRequest("POST /api/check-in", { foo: 1 });
    const b = hashRequest("POST /api/check-in", { foo: 1 });
    expect(a).toBe(b);
    expect(a).toHaveLength(64); // sha256 hex
  });

  it("changes when the endpoint changes", () => {
    expect(hashRequest("POST /api/a", { x: 1 })).not.toBe(
      hashRequest("POST /api/b", { x: 1 }),
    );
  });

  it("changes when the body changes", () => {
    expect(hashRequest("POST /api/a", { x: 1 })).not.toBe(
      hashRequest("POST /api/a", { x: 2 }),
    );
  });

  it("treats null and undefined bodies identically", () => {
    expect(hashRequest("POST /api/a", null)).toBe(
      hashRequest("POST /api/a", undefined),
    );
  });
});
