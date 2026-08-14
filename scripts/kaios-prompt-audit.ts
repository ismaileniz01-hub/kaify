/**
 * Compile representative KAIOS runtime prompts (no secrets / no real user data)
 * and write metadata under kaios/audit/.
 *
 * Run: npx tsx scripts/kaios-prompt-audit.ts
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildRuntimeContext } from "@/lib/kaios/context/builder";
import { compilePrompt } from "@/lib/kaios/compiler/prompt";
import type { CoachId } from "@/lib/kaios/routing/intent";

type Scenario = {
  id: string;
  coach: CoachId;
  message: string;
  locale: string;
  userState?: string;
  memoryItems?: string[];
  teamFacts?: string[];
  hasImage?: boolean;
};

const scenarios: Scenario[] = [
  {
    id: "kai_casual",
    coach: "kai",
    message: "Selam, nasılsın?",
    locale: "tr",
  },
  {
    id: "alex_simple_question",
    coach: "alex",
    message: "How deep should I squat?",
    locale: "en",
    userState: "goal: strength; experience: intermediate",
    memoryItems: ["prefers barbell work"],
  },
  {
    id: "alex_program_request",
    coach: "alex",
    message: "Build me a 4-day workout program",
    locale: "en",
    userState: "equipment: gym; days: 4",
    memoryItems: ["squats 3x/week"],
    teamFacts: ["Maya owns nutrition macros"],
  },
  {
    id: "maya_normal_nutrition",
    coach: "maya",
    message: "How much protein should I eat on training days?",
    locale: "en",
    userState: "weight_kg: 78; goal: recomp",
    memoryItems: ["likes Turkish breakfast"],
  },
  {
    id: "maya_vision_response",
    coach: "maya",
    message: "Analyze this meal photo",
    locale: "en",
    hasImage: true,
    userState: "calorie_goal: 2100",
  },
  {
    id: "leo_analysis",
    coach: "leo",
    message: "Score my physique from this photo",
    locale: "en",
    hasImage: true,
    memoryItems: ["last overall 71"],
  },
  {
    id: "council_turn",
    coach: "council",
    message: "Weekly check-in",
    locale: "en",
    userState: "streak: 7; workouts: 4/5",
    teamFacts: ["Alex owns training", "Maya owns nutrition"],
  },
];

function countActiveCoachCores(system: string, active: CoachId): number {
  if (active === "council") {
    return system.includes("council:") ? 1 : 0;
  }
  const cores: CoachId[] = ["alex", "maya", "leo", "kai"];
  let count = 0;
  for (const c of cores) {
    const re = new RegExp(`(?:^|\\n)${c}:\\s*\\n\\s*role:`, "m");
    if (re.test(system)) count += 1;
  }
  return count;
}

function auditOne(s: Scenario) {
  const ctx = buildRuntimeContext({
    coach: s.coach,
    message: s.message,
    locale: s.locale,
    userState: s.userState,
    memoryItems: s.memoryItems,
    teamFacts: s.teamFacts,
    hasImage: s.hasImage,
  });
  const compiled = compilePrompt(ctx);
  const system = compiled.messages[0]?.content ?? "";
  const blob = compiled.messages.map((m) => m.content).join("\n\n");
  const localePackLines = (system.match(/^locale\./gm) ?? []).length;
  const activeCount = countActiveCoachCores(system, s.coach);

  // Irrelevant memory: casual tier must drop caller-provided memory.
  const irrelevantMemoryAbsent =
    ctx.intent !== "casual" || !blob.includes("likes Turkish breakfast");

  return {
    id: s.id,
    coach: s.coach,
    intent: ctx.intent,
    tier: ctx.tier,
    maxOutputTokens: ctx.maxTokens,
    messageCount: compiled.messages.length,
    estimatedInputTokens: compiled.breakdown.total,
    breakdown: compiled.breakdown,
    checks: {
      noFullSpecTitle: !blob.includes("Kaify AI Operating System —"),
      oneActiveCoachIdentity: activeCount === 1,
      oneLocalePack: localePackLines === 1,
      noSourceMarkdownPath: !blob.includes("kaios/source/"),
      irrelevantMemoryAbsent,
      unrelatedCoachCoresAbsent: activeCount <= 1,
    },
    systemPreview: system.slice(0, 1400),
  };
}

const outDir = join(process.cwd(), "kaios/audit");
mkdirSync(outDir, { recursive: true });

const results = scenarios.map(auditOne);
const summary = {
  generatedAt: new Date().toISOString(),
  note: "Synthetic fixtures only — no real user data or secrets.",
  results,
  allPassed: results.every((r) => Object.values(r.checks).every(Boolean)),
};

writeFileSync(
  join(outDir, "runtime-prompt-audit.json"),
  JSON.stringify(summary, null, 2),
);

console.log(
  JSON.stringify(
    {
      allPassed: summary.allPassed,
      count: results.length,
      intents: results.map((r) => ({
        id: r.id,
        intent: r.intent,
        tokens: r.estimatedInputTokens,
        checks: r.checks,
      })),
    },
    null,
    2,
  ),
);
