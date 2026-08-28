import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";

const from = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: () => ({ from }),
}));

vi.mock("@/lib/services/notifications.service", () => ({
  createNotification: vi.fn(),
}));

function thenable(result: { data: unknown; error: unknown }) {
  const api: Record<string, unknown> = {};
  const self = new Proxy(api, {
    get(_target, prop) {
      if (prop === "then") {
        return (resolve: (value: unknown) => void) => resolve(result);
      }
      if (prop === "single" || prop === "maybeSingle") {
        return () => Promise.resolve(result);
      }
      return () => self;
    },
  });
  return self;
}

import {
  getUserSupportTicket,
  listAdminSupportTickets,
} from "@/lib/services/support.service";

describe("support inbox", () => {
  beforeEach(() => {
    from.mockReset();
  });

  it("does not insert a ticket when the user only opens Contact", async () => {
    from.mockReturnValue(thenable({ data: [], error: null }));
    const ticket = await getUserSupportTicket("user-1");
    expect(ticket.id).toBe("");
    expect(ticket.messages).toEqual([]);
    expect(from).toHaveBeenCalledWith("support_tickets");
    expect(from).not.toHaveBeenCalledWith("support_messages");
  });

  it("surfaces a ticket with a user message in the admin inbox", async () => {
    from.mockImplementation((table: string) => {
      if (table === "support_tickets") {
        return thenable({
          data: [
            {
              id: "t1",
              user_id: "user-1",
              subject: "Support request",
              status: "open",
              updated_at: "2026-08-28T12:00:00.000Z",
            },
          ],
          error: null,
        });
      }
      if (table === "support_messages") {
        return thenable({
          data: [
            {
              ticket_id: "t1",
              body: "Uygulama açılmıyor",
              created_at: "2026-08-28T12:00:00.000Z",
            },
          ],
          error: null,
        });
      }
      if (table === "profiles") {
        return thenable({
          data: [{ id: "user-1", display_name: "Ayşe" }],
          error: null,
        });
      }
      return thenable({ data: [], error: null });
    });

    const tickets = await listAdminSupportTickets();
    expect(tickets).toHaveLength(1);
    expect(tickets[0]?.userName).toBe("Ayşe");
    expect(tickets[0]?.lastMessage).toBe("Uygulama açılmıyor");
  });

  it("throws instead of returning an empty inbox when the list query fails", async () => {
    from.mockReturnValue(
      thenable({ data: null, error: { message: "permission denied" } }),
    );
    await expect(listAdminSupportTickets()).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
    } satisfies Partial<ApiError>);
  });
});
