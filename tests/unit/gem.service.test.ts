import { afterEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: () => ({ rpc }),
}));

import { earnGems, spendGems } from "@/lib/services/gem.service";
import { ApiError } from "@/lib/api/errors";

afterEach(() => {
  vi.clearAllMocks();
});

describe("gem.service RPC mapping", () => {
  it("earnGems returns RPC payload on success", async () => {
    rpc.mockResolvedValue({
      data: { applied: true, duplicate: false, balance: 120, amount: 10 },
      error: null,
    });

    const result = await earnGems({
      userId: "u1",
      amount: 10,
      type: "daily_chest",
      description: "test",
      idempotencyKey: "key-1",
    });

    expect(result.balance).toBe(120);
    expect(rpc).toHaveBeenCalledWith("earn_gems", expect.objectContaining({
      p_user_id: "u1",
      p_amount: 10,
      p_idempotency_key: "key-1",
    }));
  });

  it("earnGems maps P0001 to VALIDATION_ERROR", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "P0001", message: "Amount must be positive" },
    });

    await expect(
      earnGems({
        userId: "u1",
        amount: 0,
        type: "daily_chest",
        description: "test",
        idempotencyKey: "key-2",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("spendGems maps insufficient balance to CONFLICT", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "P0001", message: "Insufficient gem balance" },
    });

    await expect(
      spendGems({
        userId: "u1",
        amount: 50,
        type: "market_purchase",
        description: "test",
        idempotencyKey: "key-3",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws INTERNAL_ERROR when RPC returns empty data", async () => {
    rpc.mockResolvedValue({ data: null, error: null });

    await expect(
      earnGems({
        userId: "u1",
        amount: 5,
        type: "welcome_bonus",
        description: "test",
        idempotencyKey: "key-4",
      }),
    ).rejects.toBeInstanceOf(ApiError);
  });
});
