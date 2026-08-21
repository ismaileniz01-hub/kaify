/**
 * Chaos / failure-path validation for KAIOS tools, events, schemas, and cards.
 * Uses file-local mocks (do not share module mocks with tool-authorization.test.ts).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PENDING_B = "pending-owned-by-b";

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
const patchAnalyticsDaily = vi.fn();
const getTodayNutritionSnapshot = vi.fn();
let pendingInsertError: { message: string } | null = null;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: () => ({
    from: (table: string) => {
      if (table === "analytics_pending_confirmations") {
        return {
          insert: (row: Record<string, unknown>) => ({
            select: () => ({
              single: async () => {
                if (pendingInsertError) {
                  return { data: null, error: pendingInsertError };
                }
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
                return { data: { id }, error: null };
              },
            }),
          }),
          select: () => {
            let filters: Record<string, string> = {};
            const api = {
              eq: (col: string, val: string) => {
                filters[col] = val;
                return api;
              },
              maybeSingle: async () => {
                const row = filters.id ? pendingStore.get(filters.id) : undefined;
                if (!row) return { data: null, error: null };
                if (filters.user_id && row.user_id !== filters.user_id) {
                  return { data: null, error: null };
                }
                return { data: row, error: null };
              },
            };
            return api;
          },
          update: (patch: Record<string, unknown>) => {
            let filters: Record<string, string> = {};
            const api = {
              eq: (col: string, val: string) => {
                filters[col] = val;
                return api;
              },
              select: () => ({
                maybeSingle: async () => {
                  const row = pendingStore.get(filters.id);
                  if (!row) return { data: null, error: null };
                  if (filters.user_id && row.user_id !== filters.user_id) {
                    return { data: null, error: null };
                  }
                  if (filters.status && row.status !== filters.status) {
                    return { data: null, error: null };
                  }
                  Object.assign(row, patch);
                  return { data: { id: row.id }, error: null };
                },
              }),
            };
            return api;
          },
        };
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      };
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

import { confirmPendingAnalytics } from "@/lib/services/analytics-confirmation.service";
import { executeTool } from "@/lib/kaios/tools";
import {
  applyKaiosEvent,
  emitKaiosEventBestEffort,
} from "@/lib/kaios/events";
import { maybeGenerateStructuredCard } from "@/lib/ai/structured-chat";
import { AI_FEATURES } from "@/lib/ai/budget";
import {
  SCHEMA_VERSION,
  parseBaseEnvelope,
  parseMealAnalysisResponse,
} from "@/lib/kaios/schemas";

beforeEach(() => {
  pendingStore.clear();
  pendingInsertError = null;
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

describe("tool hydration write failure", () => {
  it("returns ok:false when pending confirmation insert fails (no fake success)", async () => {
    pendingInsertError = { message: "db write failed" };
    const result = await executeTool(USER_A, {
      name: "recordHydration",
      args: { liters: 1.5 },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("TOOL_EXECUTION_FAILED");
      expect(result.message).toMatch(/onay kaydı|db write failed/i);
    }
  });
});

describe("emitKaiosEventBestEffort chaos", () => {
  it("never throws when the emit path fails (logger boom)", async () => {
    // Same-module calls won't see a spy on applyKaiosEvent; force emitKaiosEvent
    // to throw via the mocked logger so best-effort must catch it.
    const { logger } = await import("@/lib/logger");
    vi.mocked(logger.info).mockImplementationOnce(() => {
      throw new Error("log exploded");
    });

    await expect(
      emitKaiosEventBestEffort({
        category: "system",
        type: "chaos_test",
        userId: USER_A,
        payload: {},
        at: new Date().toISOString(),
      }),
    ).resolves.toBeNull();
  });

  it("never throws on a normal hydration event", async () => {
    await expect(
      emitKaiosEventBestEffort({
        category: "hydration",
        type: "hydration_recorded",
        userId: USER_A,
        payload: { liters: 2 },
        at: new Date().toISOString(),
      }),
    ).resolves.not.toThrow();
  });
});

describe("structured-chat hard-stop under KAIOS", () => {
  it("returns null when kaiosRuntime is true", async () => {
    expect(AI_FEATURES.kaiosRuntime).toBe(true);
    const result = await maybeGenerateStructuredCard({
      coachId: "alex",
      userMessage: "create a workout program for me please",
      coachReply: "Here is a plan",
      locale: "en",
    });
    expect(result).toBeNull();
  });
});

describe("schema failure cases", () => {
  it("parseBaseEnvelope rejects missing/invalid envelopes", () => {
    expect(parseBaseEnvelope(null).ok).toBe(false);
    expect(parseBaseEnvelope(undefined).ok).toBe(false);
    expect(parseBaseEnvelope("not-json-object").ok).toBe(false);
    expect(
      parseBaseEnvelope({
        schema_version: SCHEMA_VERSION,
        coach: "alex",
      }).ok,
    ).toBe(false);
    expect(
      parseBaseEnvelope({
        schema_version: "",
        coach: "alex",
        message: "hi",
      }).ok,
    ).toBe(false);
    expect(
      parseBaseEnvelope({
        schema_version: SCHEMA_VERSION,
        coach: "not-a-coach",
        message: "hi",
      }).ok,
    ).toBe(false);
  });

  it("parseMealAnalysisResponse rejects incomplete / bad provenance data", () => {
    expect(
      parseMealAnalysisResponse({
        schema_version: SCHEMA_VERSION,
        coach: "maya",
        message: "Rough estimate",
        data: { calories: 400, protein: 30, carbohydrates: 40, fat: 12 },
      }).ok,
    ).toBe(false);

    expect(
      parseMealAnalysisResponse({
        schema_version: SCHEMA_VERSION,
        coach: "alex",
        message: "Wrong coach for meal",
        data: {
          calories: 400,
          protein: 30,
          carbohydrates: 40,
          fat: 12,
          provenance: "model_estimate",
        },
      }).ok,
    ).toBe(false);

    expect(
      parseMealAnalysisResponse({
        schema_version: SCHEMA_VERSION,
        coach: "maya",
        message: "ok",
        data: {
          calories: "lots",
          protein: 30,
          carbohydrates: 40,
          fat: 12,
          provenance: "catalog",
        },
      }).ok,
    ).toBe(false);
  });
});

describe("confirmPendingAnalytics ownership", () => {
  it("wrong owner gets NOT_FOUND and leaves row pending", async () => {
    await expect(
      confirmPendingAnalytics(USER_A, PENDING_B),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(pendingStore.get(PENDING_B)?.status).toBe("pending");
  });
});

describe("applyKaiosEvent determinism smoke", () => {
  it("hydration_recorded patches water without needing AI", () => {
    const result = applyKaiosEvent({
      category: "hydration",
      type: "hydration_recorded",
      userId: USER_A,
      payload: { liters: 2.25 },
      at: new Date().toISOString(),
    });
    expect(result.needsAi).toBe(false);
    expect(result.statePatches.last_water_liters).toBe(2.25);
  });
});
