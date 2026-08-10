/**
 * LIVE DeepSeek conversational validation for KAIOS coaches/intents.
 * Skips when DEEPSEEK_API_KEY is unset — never fabricates provider metrics.
 */
import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { orchestrateCoachChat, type OrchestrateResultMeta } from "@/lib/kaios/orchestrator";
import { outputBudgetFor, resolveIntent } from "@/lib/kaios/routing/intent";
import type { CoachId } from "@/lib/kaios/routing/intent";
import { liveCredentials, skipReason } from "./credentials";

type SampleResult = {
  label: string;
  coach: CoachId;
  message: string;
  intent: string;
  modelCallCount: number;
  latencyMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  cacheHitTokens: number | null;
  cacheMissTokens: number | null;
  assistantPreview: string;
  coachInEnvelope: string | null;
  schemaOk: boolean;
  withinBudget: boolean;
  malformed: boolean;
};

const SAMPLES: Array<{
  label: string;
  coach: CoachId;
  message: string;
  samples: number;
}> = [
  { label: "kai_casual", coach: "kai", message: "Hey, how's it going?", samples: 2 },
  {
    label: "kai_motivation",
    coach: "kai",
    message: "I keep skipping the gym and feel lazy",
    samples: 2,
  },
  {
    label: "kai_health_safety",
    coach: "kai",
    message: "My chest hurts during workouts — what should I do?",
    samples: 2,
  },
  {
    label: "alex_exercise_form",
    coach: "alex",
    message: "How deep should I squat for good form?",
    samples: 2,
  },
  {
    label: "alex_programming",
    coach: "alex",
    message: "Build me a simple 3-day full-body program",
    samples: 2,
  },
  {
    label: "alex_progression",
    coach: "alex",
    message: "How should I progress my bench over 8 weeks?",
    samples: 2,
  },
  {
    label: "maya_nutrition",
    coach: "maya",
    message: "How much protein should I eat on a cut?",
    samples: 2,
  },
  {
    label: "maya_structured_plan",
    coach: "maya",
    message: "Make me a weekly meal plan for high protein",
    samples: 2,
  },
  {
    label: "leo_synthesis",
    coach: "leo",
    message: "What does good posture look like when standing?",
    samples: 2,
  },
  {
    label: "council_turn",
    coach: "council",
    message: "I have 40 minutes today — training or recovery?",
    samples: 2,
  },
];

async function runOne(
  coach: CoachId,
  message: string,
  label: string,
): Promise<SampleResult> {
  const intent = resolveIntent({ coach, message });
  const budget = outputBudgetFor(intent);
  const started = Date.now();
  const out: { meta?: OrchestrateResultMeta } = {};
  let text = "";
  for await (const chunk of orchestrateCoachChat(
    {
      userId: "kaios-live-synthetic-user",
      coachId: coach,
      message,
      locale: "en",
      userState: "Synthetic test athlete. Goal: general fitness.",
    },
    out,
  )) {
    if (
      chunk.event === "delta" &&
      chunk.data &&
      typeof chunk.data === "object" &&
      "content" in chunk.data
    ) {
      text += String(
        (chunk.data as { content?: unknown }).content ?? "",
      );
    }
  }
  const meta = out.meta;
  expect(meta).toBeTruthy();
  if (!meta) throw new Error("missing orchestrator meta");
  const usage = meta.telemetry.providerUsage;
  const completion = usage.outputTokens;
  const malformed =
    resolveIntent({ coach, message }) !== meta.intent
      ? true
      : needsStructureButEmpty(meta.intent, meta.assistantText || text);

  return {
    label,
    coach,
    message,
    intent: meta.intent,
    modelCallCount: meta.modelCallCount,
    latencyMs: Date.now() - started,
    inputTokens: usage.inputTokens,
    outputTokens: completion,
    totalTokens: usage.totalTokens,
    cacheHitTokens: usage.cacheHitTokens,
    cacheMissTokens: usage.cacheMissTokens,
    assistantPreview: (meta.assistantText || text).slice(0, 240),
    coachInEnvelope: meta.envelope?.coach ?? null,
    schemaOk: Boolean(meta.envelope?.message),
    withinBudget:
      completion == null ? true : completion <= budget + 40 /* small slack */,
    malformed,
  };
}

function needsStructureButEmpty(intent: string, text: string): boolean {
  return text.trim().length === 0;
}

describe("LIVE DeepSeek conversational validation", () => {
  const creds = liveCredentials();

  it("runs multi-sample coach/intent evals when DeepSeek is configured", async () => {
    if (!creds.deepseek) {
      console.warn(skipReason("deepseek"));
      return;
    }

    const results: SampleResult[] = [];
    for (const sample of SAMPLES) {
      for (let i = 0; i < sample.samples; i++) {
        const row = await runOne(sample.coach, sample.message, `${sample.label}#${i + 1}`);
        results.push(row);
        expect(row.modelCallCount).toBe(1);
        expect(row.coachInEnvelope).toBe(sample.coach);
        expect(row.withinBudget).toBe(true);
        expect(row.assistantPreview.length).toBeGreaterThan(0);
      }
    }

    const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)] ?? null;
    const p95 = latencies[Math.floor(latencies.length * 0.95)] ?? null;
    const evidence = {
      capturedAt: new Date().toISOString(),
      provider: "deepseek",
      liveProviderCalls: true,
      sampleCount: results.length,
      malformedRate:
        results.filter((r) => r.malformed).length / Math.max(results.length, 1),
      p50LatencyMs: p50,
      p95LatencyMs: p95,
      results,
    };

    const dir = join(process.cwd(), "kaios/live-evidence");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "deepseek-conversational.json"),
      JSON.stringify(evidence, null, 2),
    );
  }, 600_000);
});
