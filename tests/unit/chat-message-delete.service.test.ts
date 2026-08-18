import { beforeEach, describe, expect, it, vi } from "vitest";

const invalidateUserReadCaches = vi.fn(async (_userId: string) => undefined);

const state = {
  messages: [
    {
      id: "user-1",
      user_id: "u1",
      coach_id: "alex",
      reply_to_message_id: null,
      thread_type: "direct",
      sender: "user",
    },
    {
      id: "coach-1",
      user_id: "u1",
      coach_id: "alex",
      reply_to_message_id: "user-1",
      thread_type: "direct",
      sender: "coach",
    },
  ],
  pending: [
    {
      id: "pending-1",
      user_id: "u1",
      message_id: "coach-1",
      payload: { patch: { workoutsCompleted: 1, caloriesBurned: 120 } },
      status: "confirmed",
      created_at: "2026-08-18T09:00:00.000Z",
      resolved_at: "2026-08-18T09:05:00.000Z",
      source_message_id: null,
    },
  ],
  analytics: {
    calories_consumed: 0,
    calories_burned: 200,
    workouts_completed: 2,
    water_liters: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
  },
  memory: [{ id: "mem-1" }],
};

vi.mock("@/lib/cache/invalidate", () => ({
  invalidateUserReadCaches: (userId: string) => invalidateUserReadCaches(userId),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: () => ({
    from(table: string) {
      if (table === "chat_messages") {
        return {
          select(_cols: string) {
            let filters: Record<string, unknown> = {};
            const chain = {
              eq(key: string, value: unknown) {
                filters[key] = value;
                return chain;
              },
              maybeSingle: async () => ({
                data:
                  state.messages.find(
                    (row) =>
                      row.id === filters.id &&
                      row.user_id === filters.user_id &&
                      row.thread_type === filters.thread_type,
                  ) ?? null,
                error: null,
              }),
              order: async () => ({
                data: state.messages.filter(
                  (row) =>
                    row.user_id === filters.user_id &&
                    row.thread_type === filters.thread_type &&
                    row.coach_id === filters.coach_id,
                ),
                error: null,
              }),
            };
            return chain;
          },
          delete() {
            let ids: string[] = [];
            let userId = "";
            const chain = {
              eq(key: string, value: unknown) {
                if (key === "user_id") userId = String(value);
                return chain;
              },
              in(_key: string, value: string[]) {
                ids = value;
                return chain;
              },
              select: async () => {
                const removed = state.messages.filter(
                  (row) => row.user_id === userId && ids.includes(row.id),
                );
                state.messages = state.messages.filter((row) => !removed.includes(row));
                return { data: removed.map((row) => ({ id: row.id })), error: null };
              },
            };
            return chain;
          },
        };
      }

      if (table === "profiles") {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: async () => ({
                    data: { timezone: "UTC" },
                    error: null,
                  }),
                };
              },
            };
          },
        };
      }

      if (table === "analytics_pending_confirmations") {
        return {
          select() {
            let userId = "";
            let ids: string[] = [];
            let column: "message_id" | "source_message_id" = "message_id";
            const chain = {
              eq(_key: string, value: unknown) {
                userId = String(value);
                return chain;
              },
              async in(key: string, value: string[]) {
                column =
                  key === "source_message_id" ? "source_message_id" : "message_id";
                ids = value;
                return {
                  data: state.pending.filter(
                    (row) =>
                      row.user_id === userId &&
                      typeof (row as Record<string, unknown>)[column] === "string" &&
                      ids.includes((row as Record<string, unknown>)[column] as string),
                  ),
                  error: null,
                };
              },
            };
            return chain;
          },
          delete() {
            let ids: string[] = [];
            let userId = "";
            const chain = {
              eq(_key: string, value: unknown) {
                userId = String(value);
                return chain;
              },
              in(_key: string, value: string[]) {
                ids = value;
                return Promise.resolve({
                  data: null,
                  error: null,
                }).then((result) => {
                  state.pending = state.pending.filter(
                    (row) => !(row.user_id === userId && ids.includes(row.id)),
                  );
                  return result;
                });
              },
            };
            return chain;
          },
        };
      }

      if (table === "analytics_daily") {
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      maybeSingle: async () => ({ data: { ...state.analytics }, error: null }),
                    };
                  },
                };
              },
            };
          },
          update(next: Record<string, unknown>) {
            Object.assign(state.analytics, next);
            return {
              eq() {
                return {
                  eq: async () => ({ data: null, error: null }),
                };
              },
            };
          },
        };
      }

      if (table === "coaching_memory") {
        return {
          delete() {
            return {
              eq() {
                return {
                  select: async () => ({ data: state.memory.splice(0), error: null }),
                };
              },
            };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  }),
}));

describe("deleteChatMessage", () => {
  beforeEach(() => {
    state.messages = [
      {
        id: "user-1",
        user_id: "u1",
        coach_id: "alex",
        reply_to_message_id: null,
        thread_type: "direct",
        sender: "user",
      },
      {
        id: "coach-1",
        user_id: "u1",
        coach_id: "alex",
        reply_to_message_id: "user-1",
        thread_type: "direct",
        sender: "coach",
      },
    ];
    state.pending = [
      {
        id: "pending-1",
        user_id: "u1",
        message_id: "coach-1",
        payload: { patch: { workoutsCompleted: 1, caloriesBurned: 120 } },
        status: "confirmed",
        created_at: "2026-08-18T09:00:00.000Z",
        resolved_at: "2026-08-18T09:05:00.000Z",
        source_message_id: null,
      },
    ];
    state.analytics = {
      calories_consumed: 0,
      calories_burned: 200,
      workouts_completed: 2,
      water_liters: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
    };
    state.memory = [{ id: "mem-1" }];
    invalidateUserReadCaches.mockClear();
  });

  it("deletes impact-set messages, rolls back analytics, and clears memory", async () => {
    const { deleteChatMessage } = await import("@/lib/services/chat-message-delete.service");

    const result = await deleteChatMessage({ userId: "u1", messageId: "user-1" });

    expect(result.deletedIds.sort()).toEqual(["coach-1", "user-1"]);
    expect(result.deletedPendingIds).toEqual(["pending-1"]);
    expect(result.rolledBackPendingIds).toEqual(["pending-1"]);
    expect(result.clearedMemoryCount).toBe(1);
    expect(state.analytics.workouts_completed).toBe(1);
    expect(state.analytics.calories_burned).toBe(80);
    expect(invalidateUserReadCaches).toHaveBeenCalledWith("u1");
  });
});
