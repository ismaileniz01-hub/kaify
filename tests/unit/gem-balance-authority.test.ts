import { describe, expect, it } from "vitest";
import { pickAuthoritativeGemBalance } from "@/lib/services/gem-balance.service";

describe("pickAuthoritativeGemBalance", () => {
  it("uses ledger total when kai_state lagged behind streak/check-in credits", () => {
    const picked = pickAuthoritativeGemBalance(
      { balance: 1250, totalEarned: 1250, totalSpent: 0 },
      { balance: 1320, totalEarned: 1320, totalSpent: 0 },
    );
    expect(picked.dto.balance).toBe(1320);
    expect(picked.needsRepair).toBe(true);
  });

  it("keeps kai_state when it already matches the ledger view", () => {
    const same = { balance: 400, totalEarned: 500, totalSpent: 100 };
    const picked = pickAuthoritativeGemBalance(same, same);
    expect(picked.dto).toEqual(same);
    expect(picked.needsRepair).toBe(false);
  });

  it("returns zeros when both sources are missing", () => {
    expect(pickAuthoritativeGemBalance(null, null)).toEqual({
      dto: { balance: 0, totalEarned: 0, totalSpent: 0 },
      needsRepair: false,
    });
  });
});
