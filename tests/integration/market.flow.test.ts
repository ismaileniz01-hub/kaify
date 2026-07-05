import { afterEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const from = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: () => ({ rpc, from }),
}));

vi.mock("@/lib/cache", () => ({
  cached: vi.fn((_key, _ttl, producer) => producer()),
}));

vi.mock("@/lib/events/emit", () => ({
  emitDomainEvent: vi.fn(),
}));

import { purchaseMarketItem } from "@/lib/services/market.service";
import { emitDomainEvent } from "@/lib/events/emit";

afterEach(() => {
  vi.clearAllMocks();
});

describe("market purchase flow", () => {
  it("calls purchase_market_item RPC and emits domain event", async () => {
    rpc.mockResolvedValue({
      data: { balance: 200, item_id: "aura_gold", active_aura: "aura_gold" },
      error: null,
    });

    const result = await purchaseMarketItem("user-1", "aura_gold");

    expect(result.balance).toBe(200);
    expect(rpc).toHaveBeenCalledWith(
      "purchase_market_item",
      expect.objectContaining({
        p_user_id: "user-1",
        p_item_id: "aura_gold",
      }),
    );
    expect(emitDomainEvent).toHaveBeenCalled();
  });
});
