import { describe, expect, it } from "vitest";
import {
  PENDING_ANALYTICS_TTL_MS,
  pendingAnalyticsIsExpired,
} from "@/lib/services/analytics-confirmation.service";
import { validateProgramExerciseIds } from "@/lib/kaios/tools";
import { getAllExerciseIds } from "@/lib/kaios/exercises";
import {
  applyKaiosEvent,
  clearRecentKaiosEvents,
  emitKaiosEvent,
  getRecentKaiosEvents,
} from "@/lib/kaios/events";
import { AI_FEATURES } from "@/lib/ai/budget";
import { maybeGenerateStructuredCard } from "@/lib/ai/structured-chat";
import { outputBudgetFor } from "@/lib/kaios/routing/intent";
import {
  findPriorAnalysisForFingerprint,
  fingerprintVisionImage,
} from "@/lib/kaios/vision/fingerprint";
import {
  isNonSwitchingExpression,
  resolveActiveLocale,
  toLocaleLowerCaseEnglish,
  toLocaleLowerCaseTurkish,
} from "@/lib/kaios/localization/resolve";
import {
  providerUsageFromTokenUsage,
  createTokenTelemetryRecord,
  buildTokenBreakdown,
  withProviderUsage,
} from "@/lib/kaios/telemetry/tokens";
import { SCHEMA_VERSION, parseCouncilTurnResponse } from "@/lib/kaios/schemas";

describe("pending confirmation expiry", () => {
  it("treats confirmations older than TTL as expired", () => {
    const now = Date.parse("2026-08-10T12:00:00.000Z");
    const fresh = new Date(now - 60_000).toISOString();
    const stale = new Date(now - PENDING_ANALYTICS_TTL_MS - 1).toISOString();
    expect(pendingAnalyticsIsExpired(fresh, now)).toBe(false);
    expect(pendingAnalyticsIsExpired(stale, now)).toBe(true);
  });
});

describe("exercise ID rejection via tools", () => {
  it("rejects unknown exercise ids without pretending success", () => {
    const known = getAllExerciseIds()[0];
    const bad = validateProgramExerciseIds([known, "totally_fake_id"]);
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.code).toBe("INVALID_EXERCISE_IDS");
      expect(bad.message).toMatch(/totally_fake_id/);
    }
    const good = validateProgramExerciseIds([known]);
    expect(good.ok).toBe(true);
  });
});

describe("event engine", () => {
  it("applies meal_saved hints without AI and buffers per user", async () => {
    clearRecentKaiosEvents("user-a");
    const result = applyKaiosEvent({
      category: "nutrition",
      type: "meal_saved",
      userId: "user-a",
      payload: { meal: { calories: 500, protein: 40, carbs: 40, fat: 15 } },
      at: new Date().toISOString(),
    });
    expect(result.needsAi).toBe(false);
    expect(result.memoryHints[0]).toMatch(/meal_saved:500kcal/);
    await emitKaiosEvent({
      category: "hydration",
      type: "hydration_recorded",
      userId: "user-a",
      payload: { liters: 2.1 },
      at: new Date().toISOString(),
    });
    expect(getRecentKaiosEvents("user-a").some((e) => e.type === "hydration_recorded")).toBe(
      true,
    );
  });
});

describe("no second LLM structured-card call under KAIOS", () => {
  it("maybeGenerateStructuredCard hard-stops when kaiosRuntime is on", async () => {
    // Default production config enables KAIOS.
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

describe("intent output ceilings", () => {
  it("keeps routine ceilings far below legacy ~900–1800 chat caps", () => {
    expect(outputBudgetFor("casual")).toBeLessThanOrEqual(100);
    expect(outputBudgetFor("motivation")).toBeLessThanOrEqual(160);
    expect(outputBudgetFor("nutrition_question")).toBeLessThanOrEqual(250);
    expect(outputBudgetFor("programming")).toBeLessThanOrEqual(450);
    // Analysis intents may be higher but still below legacy dual-call stacks.
    expect(outputBudgetFor("meal_analysis")).toBeLessThan(900);
  });
});

describe("Leo same-image fingerprint stability", () => {
  it("reuses prior analysis for identical fingerprints", () => {
    const fp = fingerprintVisionImage("abc123", "image/jpeg");
    const prior = {
      visible_muscles: ["chests"],
      scores: { chests: 72 },
      overall_score: 72,
      food_analysis: null,
    };
    const found = findPriorAnalysisForFingerprint(
      [
        { image_fingerprint: "other", analysis: { scores: { chests: 10 } } },
        { image_fingerprint: fp, analysis: prior },
      ],
      fp,
    );
    expect(found?.scores).toEqual({ chests: 72 });
    expect(fingerprintVisionImage("abc123", "image/jpeg")).toBe(fp);
  });
});

describe("localization resolve rules", () => {
  it("does not switch locale on short expressions", () => {
    expect(isNonSwitchingExpression("ok")).toBe(true);
    expect(isNonSwitchingExpression("thanks")).toBe(true);
    expect(isNonSwitchingExpression("💪")).toBe(true);
    expect(isNonSwitchingExpression("I need a new meal plan tomorrow")).toBe(
      false,
    );
    expect(
      resolveActiveLocale({
        message: "ok",
        messageLocale: "de",
        savedLocale: "tr",
      }),
    ).toBe("tr");
  });

  it("honors explicit instruction over message language", () => {
    expect(
      resolveActiveLocale({
        explicitLocale: "en",
        messageLocale: "tr",
        savedLocale: "tr",
        message: "Merhaba, nasılsın?",
      }),
    ).toBe("en");
  });

  it("applies Turkish casing without affecting English", () => {
    expect(toLocaleLowerCaseTurkish("İSTANBUL")).toBe("istanbul");
    expect(toLocaleLowerCaseTurkish("IĞDIR")).toBe("ığdır");
    expect(toLocaleLowerCaseEnglish("Istanbul")).toBe("istanbul");
    expect(toLocaleLowerCaseEnglish("ISTANBUL")).toBe("istanbul");
  });
});

describe("telemetry readiness", () => {
  it("records provider usage fields when available", () => {
    const base = createTokenTelemetryRecord({
      coach: "kai",
      intent: "casual",
      tier: 0,
      breakdown: buildTokenBreakdown({
        core: 10,
        safety: 20,
        capsules: 30,
        locale: 5,
        trusted: 0,
        knowledge: 0,
        outputHint: 0,
        history: 0,
        userMessage: 5,
      }),
      maxOutputTokens: 80,
    });
    expect(base.providerUsage.source).toBe("unavailable");
    const live = withProviderUsage(base, {
      prompt_tokens: 100,
      completion_tokens: 40,
      total_tokens: 140,
      prompt_cache_hit_tokens: 60,
      prompt_cache_miss_tokens: 40,
    }, { modelCallCount: 1, latencyMs: 250 });
    expect(live.providerUsage.source).toBe("provider");
    expect(live.providerUsage.inputTokens).toBe(100);
    expect(live.providerUsage.outputTokens).toBe(40);
    expect(live.providerUsage.cacheHitTokens).toBe(60);
    expect(live.modelCallCount).toBe(1);
    expect(live.latencyMs).toBe(250);
    expect(providerUsageFromTokenUsage(null).source).toBe("unavailable");
  });
});

describe("Council await_user + no fake user replies", () => {
  it("parses await_user and never invents a user speaker", () => {
    const parsed = parseCouncilTurnResponse({
      schema_version: SCHEMA_VERSION,
      coach: "council",
      message: "Kai checking in",
      intent: "council_turn",
      data: {
        await_user: true,
        speakers: [
          { coach: "kai", message: "How was training this week?" },
          { coach: "alex", message: "Any heavy sets?" },
        ],
      },
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.data?.await_user).toBe(true);
      const speakers = parsed.data.data?.speakers ?? [];
      expect(speakers.map((s) => s.coach)).toEqual(["kai", "alex"]);
      expect(speakers.length).toBe(2);
    }
  });
});
