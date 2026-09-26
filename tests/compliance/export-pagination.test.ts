import { describe, expect, it } from "vitest";
import {
  EXPORT_PAGE_SIZE,
  EXPORT_TABLE_ROW_CAP,
  fetchOwnedRowsPaged,
} from "@/lib/compliance/export-stream";
import { USER_EXPORT_TABLES } from "@/lib/compliance/export-tables";
import { ApiError } from "@/lib/api/errors";
import type { SupabaseClient } from "@supabase/supabase-js";

function fakeDb(rowsByTable: Record<string, unknown[]>, failTable?: string) {
  return {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          range: async (from: number, to: number) => {
            if (table === failTable && from > 0) {
              return { data: null, error: { message: "boom" } };
            }
            const rows = rowsByTable[table] ?? [];
            return { data: rows.slice(from, to + 1), error: null };
          },
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}

describe("export pagination (PRIV-002)", () => {
  it("returns empty arrays for empty tables", async () => {
    const rows = await fetchOwnedRowsPaged(fakeDb({ chat_messages: [] }), "chat_messages", "user_id", "u1", 50);
    expect(rows).toEqual([]);
  });

  it("pages across the boundary without dropping rows", async () => {
    const all = Array.from({ length: 250 }, (_, i) => ({ id: i }));
    const rows = await fetchOwnedRowsPaged(
      fakeDb({ chat_messages: all }),
      "chat_messages",
      "user_id",
      "u1",
      100,
    );
    expect(rows).toHaveLength(250);
    expect((rows[0] as { id: number }).id).toBe(0);
    expect((rows[249] as { id: number }).id).toBe(249);
  });

  it("fails closed on mid-export page errors", async () => {
    const all = Array.from({ length: 250 }, (_, i) => ({ id: i }));
    await expect(
      fetchOwnedRowsPaged(
        fakeDb({ chat_messages: all }, "chat_messages"),
        "chat_messages",
        "user_id",
        "u1",
        100,
      ),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("exports support messages through ticket ownership without leaking join metadata", async () => {
    const rows = await fetchOwnedRowsPaged(
      fakeDb({
        support_messages: [
          {
            id: "m1",
            ticket_id: "t1",
            body: "owned",
            support_tickets: { user_id: "u1" },
          },
        ],
      }),
      "support_messages",
      "ticket_id",
      "u1",
      50,
      { table: "support_tickets", ownerColumn: "user_id" },
    );
    expect(rows).toEqual([
      { id: "m1", ticket_id: "t1", body: "owned" },
    ]);
  });

  it("defines a hard cap so mega-tables cannot be silently truncated", () => {
    expect(EXPORT_TABLE_ROW_CAP).toBe(100_000);
    expect(EXPORT_PAGE_SIZE).toBe(200);
  });

  it("covers every registered export table", () => {
    expect(USER_EXPORT_TABLES.length).toBeGreaterThan(20);
    expect(USER_EXPORT_TABLES.map((t) => t.table)).toContain("chat_messages");
    expect(USER_EXPORT_TABLES.map((t) => t.table)).toContain("billing_events");
  });
});
