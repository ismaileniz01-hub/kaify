import { afterEach, describe, expect, it, vi } from "vitest";

const insert = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: () => ({
    from: () => ({ insert }),
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { emitDomainEvent } from "@/lib/events/emit";
import { createDomainEvent } from "@/lib/events/types";

afterEach(() => {
  vi.clearAllMocks();
});

describe("domain event outbox emit", () => {
  it("persists event to domain_events table", async () => {
    emitDomainEvent(
      createDomainEvent("account.exported", "user-1", { rows: 10 }, "user-1"),
    );

    await vi.waitFor(() => {
      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: "account.exported",
          aggregate_id: "user-1",
          user_id: "user-1",
        }),
      );
    });
  });
});
