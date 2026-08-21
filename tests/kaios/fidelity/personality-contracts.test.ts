/**
 * Deterministic prompt-contract assertions — behavioral instruction markers,
 * not exact model output wording.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildRuntimeContext } from "@/lib/kaios/context/builder";
import { compilePrompt } from "@/lib/kaios/compiler/prompt";
import type { BuildRuntimeContextInput } from "@/lib/kaios/context/types";
import type { CoachId } from "@/lib/kaios/routing/intent";

type ScenarioFixture = {
  id: string;
  coach: CoachId;
  message: string;
  locale?: string;
  intentHint?: string;
  hasImage?: boolean;
  memoryItems?: string[];
  conversationTurns?: Array<{ role: string; content: string }>;
  teamFacts?: string[];
  mustIncludeInPrompt: string[];
  mustNotIncludeInPrompt?: string[];
  notes?: string;
};

type FixturesFile = {
  scenarios: ScenarioFixture[];
};

const FIXTURES_PATH = join(
  process.cwd(),
  "kaios/fixtures/personality/scenarios.json",
);

function loadScenarios(): ScenarioFixture[] {
  const raw = readFileSync(FIXTURES_PATH, "utf8");
  return (JSON.parse(raw) as FixturesFile).scenarios;
}

function promptBlob(input: BuildRuntimeContextInput): string {
  const ctx = buildRuntimeContext(input);
  const compiled = compilePrompt(ctx);
  return compiled.messages.map((m) => m.content).join("\n");
}

function scenarioInput(s: ScenarioFixture): BuildRuntimeContextInput {
  return {
    coach: s.coach,
    message: s.message,
    locale: s.locale ?? "en",
    hasImage: s.hasImage,
    memoryItems: s.memoryItems,
    conversationTurns: s.conversationTurns as BuildRuntimeContextInput["conversationTurns"],
    teamFacts: s.teamFacts,
  };
}

const ALL_SCENARIOS = loadScenarios();
const KAI_SCENARIOS = ALL_SCENARIOS.filter((s) => s.coach === "kai");

describe("KAIOS personality prompt contracts", () => {
  it("fixtures include at least 20 Kai scenarios", () => {
    expect(KAI_SCENARIOS.length).toBeGreaterThanOrEqual(20);
  });

  for (const scenario of ALL_SCENARIOS) {
    it(`${scenario.id}: prompt contains required behavioral markers`, () => {
      const blob = promptBlob(scenarioInput(scenario));

      for (const marker of scenario.mustIncludeInPrompt) {
        expect(blob, `missing marker "${marker}"`).toContain(marker);
      }

      for (const forbidden of scenario.mustNotIncludeInPrompt ?? []) {
        expect(blob, `forbidden marker "${forbidden}"`).not.toContain(forbidden);
      }
    });
  }

  describe("Kai scenario classes", () => {
    it("greeting → casual mode without permanent motivation", () => {
      const blob = promptBlob({
        coach: "kai",
        message: "Hey!",
        locale: "en",
      });
      expect(blob).toContain("kai.mode.casual");
      expect(blob).not.toContain("kai.mode.motivation");
      expect(blob).toMatch(/permanent motivation mode/i);
      expect(blob).toMatch(/street|close buddy texting/i);
    });

    it("laziness → motivation + health classification", () => {
      const blob = promptBlob({
        coach: "kai",
        message: "Too lazy for the gym today",
        locale: "en",
      });
      expect(blob).toContain("kai.mode.motivation");
      expect(blob).toContain("kai.mode.health_safety");
    });

    it("fever → health_safety / stop pressure", () => {
      const blob = promptBlob({
        coach: "kai",
        message: "Ateşim var",
        locale: "tr",
      });
      expect(blob).toContain("kai.mode.health_safety");
      expect(blob).toMatch(/no gym pressure|fever/i);
    });

    it("memory reference → memory_continuity", () => {
      const blob = promptBlob({
        coach: "kai",
        message: "Hatırlıyor musun geçen haftayı?",
        locale: "tr",
      });
      expect(blob).toContain("kai.mode.memory_continuity");
    });

    it("just talk → casual friend-first", () => {
      const blob = promptBlob({
        coach: "kai",
        message: "Sadece konuşalım",
        locale: "tr",
      });
      expect(blob).toContain("kai.mode.casual");
      expect(blob).toMatch(/friend first|just talk/i);
    });

    it("always-on kai includes slang and self-criticism boundary markers", () => {
      const blob = promptBlob({
        coach: "kai",
        message: "Hi",
        locale: "en",
      });
      expect(blob).toMatch(/slang/i);
      expect(blob).toContain("never_shame_or_dependency");
    });
  });

  describe("Alex markers", () => {
    it("form, programming, pain, RIR, substitution", () => {
      const form = promptBlob({
        coach: "alex",
        message: "Squat form cues?",
        locale: "en",
      });
      expect(form).toContain("alex.mode.form");

      const prog = promptBlob({
        coach: "alex",
        message: "4-day program please",
        locale: "en",
      });
      expect(prog).toMatch(/RIR\/RPE|alex.mode.programming/);
      expect(prog).toMatch(/never_program_without_form|after_program|alex.mode.form/);

      const pain = promptBlob({
        coach: "alex",
        message: "Sharp shoulder pain on bench",
        locale: "en",
      });
      expect(pain).toContain("alex.mode.training_safety");

      const sub = promptBlob({
        coach: "alex",
        message: "Substitute for barbell rows?",
        locale: "en",
      });
      expect(sub).toMatch(/substitutions/i);
    });

    it("nickname cadence is every 2 messages, never every sentence", () => {
      const blob = promptBlob({
        coach: "alex",
        message: "Squat form cues?",
        locale: "tr",
      });
      expect(blob).toMatch(/every 2 Alex|never_every_sentence/i);
      expect(blob).toMatch(/stuffing reis|never once per sentence/i);
    });
  });

  describe("Maya markers", () => {
    it("no food shame, model_estimate, confirm save, four macros", () => {
      const shame = promptBlob({
        coach: "maya",
        message: "I feel gross after overeating",
        locale: "en",
      });
      expect(shame).toMatch(/food shaming|adherence_over_perfection/i);

      const photo = promptBlob({
        coach: "maya",
        message: "What's on my plate?",
        locale: "en",
        hasImage: true,
      });
      expect(photo).toMatch(/model_estimate|photo_vision_identifies_food/i);

      const save = promptBlob({
        coach: "maya",
        message: "Save this meal",
        locale: "en",
      });
      expect(save).toMatch(/ask_before_saving|never_claim_save_without_tool_success/);

      const macros = promptBlob({
        coach: "maya",
        message: "Protein and carbs in this?",
        locale: "en",
      });
      expect(macros).toMatch(/calories, protein, carbs, fat|primary_fields/);
    });

    it("feminine coach voice + gender-aware address rules", () => {
      const blob = promptBlob({
        coach: "maya",
        message: "What should I eat for lunch?",
        locale: "tr",
        userState: "user_gender: male",
      });
      expect(blob).toMatch(/feminine_coach|not_kai_bro/i);
      expect(blob).toMatch(/user_gender|male_user|yakışıklı|terminator/i);

      const femaleBlob = promptBlob({
        coach: "maya",
        message: "Protein hedefim ne?",
        locale: "tr",
        userState: "user_gender: female",
      });
      expect(femaleBlob).toMatch(/female_user|güzelim|queen/i);
    });

    it("food log slang gets macro headroom + no greeting reset capsule", () => {
      const blob = promptBlob({
        coach: "maya",
        message: "1 hatay doner gomdum",
        locale: "tr",
        userState: "user_gender: male",
        teamFacts: ["alex_last_plan: Push | Pull", "leo_lagging: back"],
        conversationTurns: [
          { role: "user", content: "selam" },
          { role: "assistant", content: "Nasılsın?" },
        ],
      });
      expect(blob).toMatch(/maya\.mode\.food_log|no greeting reset/i);
      expect(blob).not.toContain("maya.mode.meal_planning");
      expect(blob).toMatch(/feminine_coach|male_user/i);
      expect(blob).toMatch(/four labeled macros|confirmation/i);
      expect(blob).toMatch(/after_every_meal|glass of water|bardak su/i);
      expect(blob).toContain("alex_last_plan: Push | Pull");
      expect(blob).toContain("leo_lagging: back");
    });
  });

  describe("Leo markers", () => {
    it("composed not hype, no BF%, no diagnosis, validate image", () => {
      const blob = promptBlob({
        coach: "leo",
        message: "Score my physique",
        locale: "en",
        hasImage: true,
      });
      expect(blob).toMatch(/composed: true|analytical/i);
      expect(blob).toMatch(/hype-coach|do_not_inflate_scores/i);
      expect(blob).toMatch(/body-fat|validate_image_before_scoring/i);
      expect(blob).toContain("do_not_diagnose_medical_conditions");
      expect(blob).toMatch(/no nicknames|never nicknames/i);
    });
  });

  describe("Council markers", () => {
    it("await_user / role digests / user_is_participant", () => {
      const blob = promptBlob({
        coach: "council",
        message: "Team meeting time",
        locale: "en",
      });
      expect(blob).toContain("user_is_participant");
      expect(blob).toContain("wait_when_user_input_needed");
      expect(blob).toContain("council.roles:");
      expect(blob).toMatch(/alex:|maya:|leo:|kai:/);
    });
  });
});
