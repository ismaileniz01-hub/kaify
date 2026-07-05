import { afterEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: () => ({ rpc }),
}));

vi.mock("@/lib/services/notifications.service", () => ({
  emitCheckInNotifications: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/events/emit", () => ({
  emitDomainEvent: vi.fn(),
}));

import { performCheckIn } from "@/lib/services/streak.service";
import { emitDomainEvent } from "@/lib/events/emit";

afterEach(() => {
  vi.clearAllMocks();
});

describe("check-in flow", () => {
  it("calls perform_daily_check_in RPC with user id", async () => {
    rpc.mockResolvedValue({
      data: {
        current_streak: 5,
        longest_streak: 10,
        freezie_balance: 1,
        gems_awarded: 10,
        already_checked_in: false,
        kai_level: 2,
      },
      error: null,
    });

    const result = await performCheckIn("user-1", "idem-key");

    expect(result.currentStreak).toBe(5);
    expect(rpc).toHaveBeenCalledWith("perform_daily_check_in", {
      p_request_key: "idem-key",
      p_user_id: "user-1",
    });
    expect(emitDomainEvent).toHaveBeenCalled();
  });

  it("maps RPC conflict to ApiError CONFLICT", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "P0001", message: "Already checked in" },
    });

    await expect(performCheckIn("user-1", null)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });
});
