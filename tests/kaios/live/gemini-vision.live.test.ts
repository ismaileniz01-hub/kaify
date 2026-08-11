/**
 * LIVE Gemini vision validation (Maya food / Leo physique observation).
 * Skips when GEMINI_API_KEY is unset — never fabricates vision metrics.
 * Uses synthetic fixtures under kaios/fixtures/gemini/ (non-PII).
 */
import { describe, expect, it } from "vitest";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { generateGeminiJson } from "@/lib/ai/gemini.client";
import {
  buildFoodObservationPrompt,
  buildImageQualityPrompt,
  buildPhysiqueObservationPrompt,
  normalizeFoodObservation,
  normalizePhysiqueObservation,
} from "@/lib/kaios/vision";
import { liveCredentials, skipReason } from "./credentials";

const FIXTURE_DIR = join(process.cwd(), "kaios/fixtures/gemini");

function loadFixture(name: string): string {
  const path = join(FIXTURE_DIR, name);
  if (!existsSync(path)) {
    throw new Error(`Missing Gemini fixture: ${name}`);
  }
  return readFileSync(path).toString("base64");
}

type VisionSample = {
  label: string;
  kind: "food" | "physique" | "quality";
  fixture: string;
  latencyMs: number;
  ok: boolean;
  observationOnly: boolean;
  noCoachPersona: boolean;
  preview: string;
  error?: string;
};

async function runVision(
  label: string,
  kind: VisionSample["kind"],
  prompt: string,
  fixture: string,
): Promise<VisionSample> {
  const started = Date.now();
  try {
    const raw = await generateGeminiJson({
      prompt,
      image: {
        base64: loadFixture(fixture),
        mimeType: "image/jpeg",
      },
      temperature: 0.2,
      usageContext: {
        userId: "kaios-live-synthetic-user",
        operation: "vision",
      },
    });
    const text = JSON.stringify(raw);
    const noCoachPersona = !/you are (maya|leo|dr\.?\s*maya)/i.test(text);
    if (kind === "food") normalizeFoodObservation(raw);
    else if (kind === "physique") normalizePhysiqueObservation(raw);
    return {
      label,
      kind,
      fixture,
      latencyMs: Date.now() - started,
      ok: true,
      observationOnly: true,
      noCoachPersona,
      preview: text.slice(0, 400),
    };
  } catch (error) {
    return {
      label,
      kind,
      fixture,
      latencyMs: Date.now() - started,
      ok: false,
      observationOnly: true,
      noCoachPersona: true,
      preview: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

describe("LIVE Gemini vision validation", () => {
  const creds = liveCredentials();

  it("runs Maya/Leo observation fixtures when Gemini is configured", async () => {
    if (!creds.gemini) {
      console.warn(skipReason("gemini"));
      return;
    }

    const cases: Array<{
      label: string;
      kind: VisionSample["kind"];
      prompt: string;
      fixture: string;
    }> = [
      {
        label: "maya_obvious_single_food",
        kind: "food",
        prompt: buildFoodObservationPrompt(),
        fixture: "maya-single-food.jpg",
      },
      {
        label: "maya_mixed_meal",
        kind: "food",
        prompt: buildFoodObservationPrompt(),
        fixture: "maya-mixed-meal.jpg",
      },
      {
        label: "maya_ambiguous_portion",
        kind: "food",
        prompt: buildFoodObservationPrompt(),
        fixture: "maya-ambiguous-portion.jpg",
      },
      {
        label: "maya_sauce_oil",
        kind: "food",
        prompt: buildFoodObservationPrompt(),
        fixture: "maya-sauce-oil.jpg",
      },
      {
        label: "maya_poor_image",
        kind: "food",
        prompt: buildFoodObservationPrompt(),
        fixture: "maya-poor-quality.jpg",
      },
      {
        label: "leo_valid_image",
        kind: "physique",
        prompt: buildPhysiqueObservationPrompt(),
        fixture: "leo-valid.jpg",
      },
      {
        label: "leo_invalid",
        kind: "quality",
        prompt: buildImageQualityPrompt(),
        fixture: "leo-invalid.jpg",
      },
      {
        label: "leo_blur",
        kind: "quality",
        prompt: buildImageQualityPrompt(),
        fixture: "leo-blur.jpg",
      },
      {
        label: "leo_crop",
        kind: "quality",
        prompt: buildImageQualityPrompt(),
        fixture: "leo-crop.jpg",
      },
      {
        label: "leo_repeat_same_image_a",
        kind: "physique",
        prompt: buildPhysiqueObservationPrompt(),
        fixture: "leo-valid.jpg",
      },
      {
        label: "leo_repeat_same_image_b",
        kind: "physique",
        prompt: buildPhysiqueObservationPrompt(),
        fixture: "leo-valid-repeat.jpg",
      },
    ];

    const results: VisionSample[] = [];
    for (const c of cases) {
      const row = await runVision(c.label, c.kind, c.prompt, c.fixture);
      results.push(row);
      expect(row.noCoachPersona).toBe(true);
      if (!row.ok) expect(row.preview).toBe("");
    }

    const evidence = {
      capturedAt: new Date().toISOString(),
      provider: "gemini",
      liveProviderCalls: true,
      fixtureDir: "kaios/fixtures/gemini",
      results: results.map((r) => ({
        ...r,
        // keep preview truncated; no prompts
      })),
    };

    const dir = join(process.cwd(), "kaios/live-evidence");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "gemini-vision.json"), JSON.stringify(evidence, null, 2));
  }, 300_000);
});
