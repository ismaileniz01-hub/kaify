/**
 * Runtime prompt matrix — FULL SYSTEM VALIDATION across coach × intent scenarios.
 * Asserts lean compiled prompts: one coach core, one locale pack, no full-spec.
 */

import { describe, expect, it } from "vitest";
import { buildRuntimeContext } from "@/lib/kaios/context/builder";
import { compilePrompt } from "@/lib/kaios/compiler/prompt";
import {
  ALEX_CORE,
  MAYA_CORE,
  LEO_CORE,
  KAI_CORE,
  COUNCIL_CORE,
} from "@/lib/kaios/capsules";
import { outputBudgetFor, type Intent } from "@/lib/kaios/routing/intent";
import type { BuildRuntimeContextInput } from "@/lib/kaios/context/types";

const FORBIDDEN_TITLE = "Kaify AI Operating System —";
const COACH_CORES = [
  ["alex", ALEX_CORE],
  ["maya", MAYA_CORE],
  ["leo", LEO_CORE],
  ["kai", KAI_CORE],
  ["council", COUNCIL_CORE],
] as const;

type Scenario = {
  name: string;
  input: BuildRuntimeContextInput;
  expectedIntent: Intent;
  activeCoach: (typeof COACH_CORES)[number][0];
  /** Casual must drop memory even when callers pass it. */
  expectMemoryDropped?: boolean;
};

const SCENARIOS: Scenario[] = [
  {
    name: "kai casual",
    input: {
      coach: "kai",
      message: "Selam, nasılsın?",
      locale: "tr",
      memoryItems: ["likes morning lifts", "streak: 3"],
      userState: "motivation style: tough love",
    },
    expectedIntent: "casual",
    activeCoach: "kai",
    expectMemoryDropped: true,
  },
  {
    name: "kai motivation",
    input: {
      coach: "kai",
      message: "Bugün salona gidesim yok, çok yorgunum.",
      locale: "tr",
      memoryItems: ["missed gym twice this week"],
    },
    expectedIntent: "motivation",
    activeCoach: "kai",
  },
  {
    name: "alex form",
    input: {
      coach: "alex",
      message: "How do I squat with good form?",
      locale: "en",
    },
    expectedIntent: "exercise_form",
    activeCoach: "alex",
  },
  {
    name: "alex program",
    input: {
      coach: "alex",
      message: "Can you build me a 4-day workout program?",
      locale: "en",
      teamFacts: ["Maya owns nutrition macros"],
    },
    expectedIntent: "programming",
    activeCoach: "alex",
  },
  {
    name: "maya nutrition",
    input: {
      coach: "maya",
      message: "How much protein should I eat?",
      locale: "en",
    },
    expectedIntent: "nutrition_question",
    activeCoach: "maya",
  },
  {
    name: "maya meal_analysis (hasImage)",
    input: {
      coach: "maya",
      message: "What is on my plate?",
      locale: "en",
      hasImage: true,
    },
    expectedIntent: "meal_analysis",
    activeCoach: "maya",
  },
  {
    name: "leo physique (hasImage)",
    input: {
      coach: "leo",
      message: "Score my physique from this photo",
      locale: "en",
      hasImage: true,
    },
    expectedIntent: "physique_analysis",
    activeCoach: "leo",
  },
  {
    name: "council turn",
    input: {
      coach: "council",
      message: "What should we focus on this week?",
      locale: "en",
      teamFacts: ["Alex owns strength"],
    },
    expectedIntent: "council_turn",
    activeCoach: "council",
  },
];

function localePackMatches(blob: string): RegExpMatchArray | null {
  return blob.match(/locale\.[A-Za-z0-9_-]+:/g);
}

describe("runtime prompt matrix", () => {
  for (const scenario of SCENARIOS) {
    it(`${scenario.name}: lean prompt + budget + single identity`, () => {
      const ctx = buildRuntimeContext(scenario.input);
      expect(ctx.intent).toBe(scenario.expectedIntent);
      expect(ctx.maxTokens).toBe(outputBudgetFor(scenario.expectedIntent));

      if (scenario.expectMemoryDropped) {
        expect(ctx.tier).toBe(0);
        expect(ctx.memoryItems).toBeUndefined();
        expect(ctx.userState).toBeUndefined();
      }

      const compiled = compilePrompt(ctx);
      const blob = compiled.messages.map((m) => m.content).join("\n");

      expect(blob).not.toContain(FORBIDDEN_TITLE);
      expect(blob).not.toMatch(/kaios\/source\//);

      const activeCore = COACH_CORES.find(([id]) => id === scenario.activeCoach)?.[1];
      expect(activeCore).toBeTruthy();
      expect(blob).toContain(activeCore!);

      const presentCores = COACH_CORES.filter(([, core]) => blob.includes(core));
      expect(presentCores.map(([id]) => id)).toEqual([scenario.activeCoach]);

      const localeLines = localePackMatches(blob);
      expect(localeLines, "exactly one locale.* pack line").toHaveLength(1);

      // Locale pack should match requested locale (or generic fallback key).
      const locale = scenario.input.locale ?? "en";
      expect(blob).toMatch(new RegExp(`locale\\.(${locale}|generic):`));
    });
  }
});
