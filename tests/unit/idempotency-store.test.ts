import { describe, expect, it, vi } from "vitest";

// If withIdempotency ever touched the DB on the no-key path this mock would throw.
vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: () => {
    throw new Error("DB must not be touched when no key is provided");
  },
}));

import { withIdempotency } from "@/lib/api/idempotency-store";

describe("withIdempotency (no key)", () => {
  it("runs the handler directly without any DB interaction", async () => {
    const handler = vi.fn().mockResolvedValue({ ok: true });
    const result = await withIdempotency({
      userId: "u1",
      endpoint: "POST /api/check-in",
      key: null,
      requestBody: null,
      handler,
    });
    expect(result).toEqual({ ok: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
