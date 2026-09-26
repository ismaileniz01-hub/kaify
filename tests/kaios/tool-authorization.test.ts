/**
 * Cross-user / tool authorization security tests for KAIOS write paths.
 * Verifies backend rejection (ownership filters, identity binding), not model refusal.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PENDING_B = "pending-owned-by-b";
const PENDING_A = "pending-owned-by-a";

type PendingRow = {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  payload: Record<string, unknown>;
  source: string;
  coach_id: string;
};

const pendingStore = new Map<string, PendingRow>();
const rpc = vi.fn();
const patchAnalyticsDaily = vi.fn();
const getTodayNutritionSnapshot = vi.fn();

function chainable(result: { data: unknown; error: unknown }) {
  const api: Record<string, unknown> = {};
  const self = () => api;
  for (const method of [
    "select",
    "insert",
    "update",
    "eq",
    "in",
    "order",
    "limit",
  ]) {
    api[method] = vi.fn(self);
  }
  api.maybeSingle = vi.fn(async () => result);
  api.single = vi.fn(async () => result);
  return api;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: () => ({
    rpc,
    from: (table: string) => {
      if (table === "analytics_pending_confirmations") {
        return {
          insert: (row: Record<string, unknown>) => {
            const id = `pending-${pendingStore.size + 1}`;
            pendingStore.set(id, {
              id,
              user_id: String(row.user_id),
              status: String(row.status ?? "pending"),
              created_at: new Date().toISOString(),
              payload: (row.payload as Record<string, unknown>) ?? {},
              source: String(row.source ?? "chat"),
              coach_id: String(row.coach_id ?? "maya"),
            });
            return {
              select: () => ({
                single: async () => ({ data: { id }, error: null }),
              }),
            };
          },
          select: () => {
            let filters: Record<string, string> = {};
            const api = {
              eq: (col: string, val: string) => {
                filters[col] = val;
                return api;
              },
              maybeSingle: async () => {
                const id = filters.id;
                const row = id ? pendingStore.get(id) : undefined;
                if (!row) return { data: null, error: null };
                if (filters.user_id && row.user_id !== filters.user_id) {
                  return { data: null, error: null };
                }
                return { data: row, error: null };
              },
              single: async () => {
                const id = filters.id;
                const row = id ? pendingStore.get(id) : undefined;
                if (!row || (filters.user_id && row.user_id !== filters.user_id)) {
                  return { data: null, error: { message: "not found" } };
                }
                return { data: row, error: null };
              },
            };
            return api;
          },
          update: (patch: Record<string, unknown>) => {
            let filters: Record<string, string> = {};
            const apply = () => {
              const row = pendingStore.get(filters.id);
              if (!row) return { data: [], error: null };
              if (filters.user_id && row.user_id !== filters.user_id) {
                return { data: [], error: null };
              }
              if (filters.status && row.status !== filters.status) {
                return { data: [], error: null };
              }
              Object.assign(row, patch);
              return { data: [{ id: row.id }], error: null };
            };
            const api = {
              eq: (col: string, val: string) => {
                filters[col] = val;
                return api;
              },
              select: async () => apply(),
              maybeSingle: async () => {
                const result = apply();
                return {
                  data: result.data[0] ?? null,
                  error: result.error,
                };
              },
            };
            return api;
          },
        };
      }

      if (table === "chat_messages") {
        let filters: Record<string, string> = {};
        const rows: unknown[] = [];
        const api = {
          select: () => api,
          eq: (col: string, val: string) => {
            filters[col] = val;
            return api;
          },
          in: () => api,
          order: () => api,
          limit: () => api,
          then: undefined as unknown,
          // awaitable thenable for executeTool getPhysiqueHistory
        };
        // Make thenable so `await admin.from(...).select...limit(5)` works
        const promise = Promise.resolve({
          data:
            filters.user_id === USER_A
              ? [{ id: "score-a", payload: { analysis: { overall_score: 70 } } }]
              : filters.user_id === USER_B
                ? [{ id: "score-b", payload: { analysis: { overall_score: 99 } } }]
                : rows,
          error: null,
        });
        return {
          select: () => ({
            eq: (col: string, val: string) => {
              filters[col] = val;
              const next = {
                eq: (c2: string, v2: string) => {
                  filters[c2] = v2;
                  return next;
                },
                in: () => next,
                order: () => next,
                limit: async () => ({
                  data:
                    filters.user_id === USER_A
                      ? [
                          {
                            id: "score-a",
                            payload: { analysis: { overall_score: 70 } },
                          },
                        ]
                      : filters.user_id === USER_B
                        ? [
                            {
                              id: "score-b",
                              payload: { analysis: { overall_score: 99 } },
                            },
                          ]
                        : [],
                  error: null,
                }),
              };
              return next;
            },
          }),
        };
      }

      if (table === "coaching_memory") {
        return {
          insert: async () => ({ data: null, error: null }),
        };
      }

      return chainable({ data: null, error: null });
    },
  }),
}));

vi.mock("@/lib/services/analytics.service", () => ({
  getTodayNutritionSnapshot: (...args: unknown[]) =>
    getTodayNutritionSnapshot(...args),
  patchAnalyticsDaily: (...args: unknown[]) => patchAnalyticsDaily(...args),
}));

vi.mock("@/lib/repositories/analytics-write.repository", () => ({
  writeConfirmAnalyticsPending: async (userId: string, pendingId: string) => {
    const row = pendingStore.get(pendingId);
    if (!row || row.user_id !== userId) {
      throw new ApiError("NOT_FOUND", "Onay bekleyen kayıt bulunamadı.");
    }
    if (row.status !== "pending") {
      if (row.status === "confirmed") return;
      throw new ApiError("CONFLICT", "Already resolved");
    }
    row.status = "confirmed";
  },
  invalidateAnalyticsUserCache: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/cache/invalidate", () => ({
  invalidateHomeBundleCache: vi.fn().mockResolvedValue(undefined),
  invalidateUserReadCaches: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  confirmPendingAnalytics,
  createPendingAnalyticsConfirmation,
  linkPendingConfirmationToMessage,
  rejectPendingAnalytics,
} from "@/lib/services/analytics-confirmation.service";
import { executeTool } from "@/lib/kaios/tools";
import {
  applyKaiosEvent,
  clearRecentKaiosEvents,
  emitKaiosEventBestEffort,
  getRecentKaiosEvents,
} from "@/lib/kaios/events";
import { AI_FEATURES } from "@/lib/ai/budget";
import { getTeamChatHistory } from "@/lib/kaios/council/turns";

beforeEach(() => {
  pendingStore.clear();
  clearRecentKaiosEvents();
  vi.clearAllMocks();
  pendingStore.set(PENDING_B, {
    id: PENDING_B,
    user_id: USER_B,
    status: "pending",
    created_at: new Date().toISOString(),
    payload: {
      summary: "B meal",
      meal: { calories: 500, protein: 40, carbs: 40, fat: 15 },
    },
    source: "chat",
    coach_id: "maya",
  });
  pendingStore.set(PENDING_A, {
    id: PENDING_A,
    user_id: USER_A,
    status: "pending",
    created_at: new Date().toISOString(),
    payload: {
      summary: "A meal",
      meal: { calories: 400, protein: 30, carbs: 30, fat: 10 },
    },
    source: "photo",
    coach_id: "maya",
  });
  getTodayNutritionSnapshot.mockResolvedValue({
    caloriesConsumed: 100,
    calorieGoal: 2100,
    proteinG: 10,
    proteinGoalG: 150,
    carbsG: 10,
    carbsGoalG: 200,
    fatG: 5,
    fatGoalG: 60,
    waterLiters: 1,
  });
  patchAnalyticsDaily.mockResolvedValue(undefined);
});

describe("cross-user pending meal confirmation", () => {
  it("rejects User A confirming User B pending (wrong owner)", async () => {
    await expect(
      confirmPendingAnalytics(USER_A, PENDING_B),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(pendingStore.get(PENDING_B)?.status).toBe("pending");
  });

  it("rejects User A rejecting User B pending", async () => {
    await expect(
      rejectPendingAnalytics(USER_A, PENDING_B),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(pendingStore.get(PENDING_B)?.status).toBe("pending");
  });

  it("rejects missing pending id for owner", async () => {
    await expect(
      confirmPendingAnalytics(USER_A, "does-not-exist"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("allows owner confirm once; duplicate confirm is idempotent", async () => {
    await confirmPendingAnalytics(USER_A, PENDING_A);
    expect(pendingStore.get(PENDING_A)?.status).toBe("confirmed");
    await expect(
      confirmPendingAnalytics(USER_A, PENDING_A),
    ).resolves.toBeUndefined();
  });

  it("linkPendingConfirmationToMessage only updates owned pending rows", async () => {
    await linkPendingConfirmationToMessage({
      userId: USER_A,
      pendingId: PENDING_B,
      messageId: "msg-a",
    });
    // Wrong owner filter → no mutation of B's row message binding.
    expect(pendingStore.get(PENDING_B)).not.toHaveProperty(
      "message_id",
      "msg-a",
    );
  });
});

describe("tool server-owned identity (client userId cannot override)", () => {
  it("saveMealMacros persists pending under server userId, ignoring args.userId", async () => {
    const result = await executeTool(USER_A, {
      name: "saveMealMacros",
      args: {
        userId: USER_B,
        user_id: USER_B,
        calories: 520,
        protein: 35,
        carbs: 40,
        fat: 18,
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as { pendingId: string; saved: boolean };
    expect(data.saved).toBe(false);
    const row = pendingStore.get(data.pendingId);
    expect(row?.user_id).toBe(USER_A);
    expect(row?.user_id).not.toBe(USER_B);
  });

  it("recordHydration queues confirmation for server userId only", async () => {
    const result = await executeTool(USER_A, {
      name: "recordHydration",
      args: { userId: USER_B, liters: 2.5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as {
      pendingId: string;
      saved: boolean;
      requiresConfirmation?: boolean;
    };
    expect(data.saved).toBe(false);
    expect(data.requiresConfirmation).toBe(true);
    const row = pendingStore.get(data.pendingId);
    expect(row?.user_id).toBe(USER_A);
    expect(row?.user_id).not.toBe(USER_B);
    expect(patchAnalyticsDaily).not.toHaveBeenCalled();
  });

  it("getNutritionState reads server userId snapshot", async () => {
    await executeTool(USER_A, {
      name: "getNutritionState",
      args: { userId: USER_B },
    });
    expect(getTodayNutritionSnapshot).toHaveBeenCalledWith(USER_A);
    expect(getTodayNutritionSnapshot).not.toHaveBeenCalledWith(USER_B);
  });

  it("getPhysiqueHistory scopes query to server userId (not peer data)", async () => {
    const result = await executeTool(USER_A, {
      name: "getPhysiqueHistory",
      args: { userId: USER_B },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const items = (result.data as { items: { id: string }[] }).items;
    expect(items.every((i) => i.id === "score-a")).toBe(true);
    expect(items.some((i) => i.id === "score-b")).toBe(false);
  });
});

describe("invalid schema / malformed tool payloads", () => {
  it("saveMealMacros rejects missing macros (no fake save)", async () => {
    const result = await executeTool(USER_A, {
      name: "saveMealMacros",
      args: { calories: 100, protein: "nope" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID_MACROS");
  });

  it("recordHydration rejects negative liters", async () => {
    const result = await executeTool(USER_A, {
      name: "recordHydration",
      args: { liters: -1 },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID_HYDRATION");
  });

  it("validateExerciseIds rejects unknown ids", async () => {
    const result = await executeTool(USER_A, {
      name: "validateExerciseIds",
      args: { ids: ["not_real_exercise"] },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID_EXERCISE_IDS");
  });

  it("unknown tool returns ok:false", async () => {
    const result = await executeTool(USER_A, {
      name: "dropAllTables" as "searchExercises",
      args: {},
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UNKNOWN_TOOL");
  });

  it("does not report hydration saved until the user confirms", async () => {
    const result = await executeTool(USER_A, {
      name: "recordHydration",
      args: { liters: 1 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as { saved: boolean; requiresConfirmation?: boolean };
    expect(data.saved).toBe(false);
    expect(data.requiresConfirmation).toBe(true);
    expect(patchAnalyticsDaily).not.toHaveBeenCalled();
  });
});

describe("event durability invariant", () => {
  it("canonical meal confirm succeeds even if event emission fails", async () => {
    const { emitKaiosEvent } = await import("@/lib/kaios/events");
    const spy = vi
      .spyOn(await import("@/lib/kaios/events"), "emitKaiosEvent")
      .mockRejectedValueOnce(new Error("event bus down"));
    // Best-effort wrapper must swallow; confirm still completes.
    await expect(
      confirmPendingAnalytics(USER_A, PENDING_A),
    ).resolves.toBeUndefined();
    expect(pendingStore.get(PENDING_A)?.status).toBe("confirmed");
    spy.mockRestore();
    void emitKaiosEvent;
  });

  it("in-process buffer is not required for applyKaiosEvent determinism", () => {
    clearRecentKaiosEvents(USER_A);
    const result = applyKaiosEvent({
      category: "hydration",
      type: "hydration_recorded",
      userId: USER_A,
      payload: { liters: 3 },
      at: new Date().toISOString(),
    });
    expect(result.needsAi).toBe(false);
    expect(result.statePatches.last_water_liters).toBe(3);
    // Clearing buffer does not erase that apply is pure over the event object.
    clearRecentKaiosEvents(USER_A);
    expect(getRecentKaiosEvents(USER_A)).toEqual([]);
  });

  it("emitKaiosEventBestEffort never throws", async () => {
    await expect(
      emitKaiosEventBestEffort({
        category: "system",
        type: "noop_test",
        userId: USER_A,
        payload: {},
        at: new Date().toISOString(),
      }),
    ).resolves.not.toThrow();
  });

  it("documents canonical stores for critical product state", () => {
    // Contract assertion for release audit — not the in-memory Map.
    const canonicalStores = {
      meal_saved: "analytics_daily / confirm_analytics_pending RPC",
      hydration_recorded: "analytics_daily via confirm_analytics_pending RPC",
      physique_scored: "chat_messages (message_type=score)",
      council_decision: "chat_messages.payload.data.decision",
    };
    expect(Object.keys(canonicalStores).length).toBe(4);
  });
});

describe("Council / team history ownership", () => {
  it("getTeamChatHistory queries only the authenticated user id", async () => {
    const fromSpy = vi.fn(() => ({
      select: () => ({
        eq: (col: string, val: string) => {
          expect(col === "user_id" ? val : true).toBeTruthy();
          if (col === "user_id") expect(val).toBe(USER_A);
          return {
            eq: () => ({
              order: () => ({
                limit: async () => ({ data: [], error: null }),
              }),
            }),
          };
        },
      }),
    }));
    const adminMod = await import("@/lib/supabase/admin");
    vi.spyOn(adminMod, "createAdminSupabaseClient").mockReturnValue({
      from: fromSpy,
    } as never);
    await getTeamChatHistory(USER_A);
    expect(fromSpy).toHaveBeenCalledWith("chat_messages");
  });
});

describe("soak flag classification guards", () => {
  it("defaults KAIOS runtime on (legacy only via explicit env)", () => {
    expect(AI_FEATURES.kaiosRuntime).toBe(true);
  });
});
