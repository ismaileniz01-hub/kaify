import { describe, expect, it, vi } from "vitest";
import { claimIdempotency, completeIdempotency } from "@/lib/api/idempotency-store";

const insert = vi.fn();
const selectMaybe = vi.fn();
const updateEq = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: () => ({
    from: () => ({
      insert,
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({ maybeSingle: selectMaybe }),
          }),
        }),
      }),
      update: () => ({
        eq: () => ({
          eq: () => ({
            eq: updateEq,
          }),
        }),
      }),
      delete: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          }),
        }),
      }),
    }),
  }),
}));

describe("response-loss idempotency", () => {
  it("replays completed body without re-running the handler", async () => {
    insert.mockResolvedValue({ error: { code: "23505", message: "dup" } });
    selectMaybe.mockResolvedValue({
      data: {
        request_hash: expect.anything(),
        status: "completed",
        response_body: { ok: true, n: 1 },
      },
      error: null,
    });

    const firstHashBody = { x: 1 };
    insert.mockResolvedValueOnce({ error: null });
    const claim1 = await claimIdempotency({
      userId: "u",
      endpoint: "POST /api/check-in",
      key: "key-1",
      requestBody: firstHashBody,
    });
    expect(claim1.kind).toBe("execute");
    await completeIdempotency("u", "POST /api/check-in", "key-1", { ok: true, n: 1 });

    insert.mockResolvedValue({ error: { code: "23505" } });
    const { hashRequest } = await import("@/lib/api/idempotency-store");
    selectMaybe.mockResolvedValue({
      data: {
        request_hash: hashRequest("POST /api/check-in", firstHashBody),
        status: "completed",
        response_body: { ok: true, n: 1 },
      },
      error: null,
    });

    const claim2 = await claimIdempotency<{ ok: boolean; n: number }>({
      userId: "u",
      endpoint: "POST /api/check-in",
      key: "key-1",
      requestBody: firstHashBody,
    });
    expect(claim2).toEqual({ kind: "replay", body: { ok: true, n: 1 } });
  });

  it("rejects concurrent in-progress duplicates", async () => {
    insert.mockResolvedValue({ error: { code: "23505" } });
    const { hashRequest } = await import("@/lib/api/idempotency-store");
    selectMaybe.mockResolvedValue({
      data: {
        request_hash: hashRequest("POST /api/market/purchase", { item: "gold" }),
        status: "in_progress",
        response_body: null,
      },
      error: null,
    });

    await expect(
      claimIdempotency({
        userId: "u",
        endpoint: "POST /api/market/purchase",
        key: "k2",
        requestBody: { item: "gold" },
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
