import { describe, expect, it } from "vitest";
import {
  SCHEMA_VERSION,
  parseCasualCoachResponse,
  parseKaiosEnvelope,
  parseMealAnalysisResponse,
} from "@/lib/kaios/schemas";

describe("KAIOS envelope schemas", () => {
  it("parses a valid casual coach envelope", () => {
    const result = parseCasualCoachResponse({
      schema_version: SCHEMA_VERSION,
      coach: "kai",
      message: "Hey — how'd today's session feel?",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.coach).toBe("kai");
      expect(result.data.message.length).toBeGreaterThan(0);
      expect(result.data.intent).toBe("casual");
    }
  });

  it("rejects envelopes missing message", () => {
    const result = parseKaiosEnvelope({
      schema_version: SCHEMA_VERSION,
      coach: "alex",
    });
    expect(result.ok).toBe(false);
  });

  it("requires nutrition provenance on meal analysis", () => {
    const bad = parseMealAnalysisResponse({
      schema_version: SCHEMA_VERSION,
      coach: "maya",
      message: "Looks like about 520 kcal.",
      data: {
        calories: 520,
        protein: 35,
        carbohydrates: 40,
        fat: 18,
      },
    });
    expect(bad.ok).toBe(false);

    const good = parseMealAnalysisResponse({
      schema_version: SCHEMA_VERSION,
      coach: "maya",
      message: "Rough plate estimate — model only.",
      data: {
        calories: 520,
        protein: 35,
        carbohydrates: 40,
        fat: 18,
        provenance: "model_estimate",
      },
    });
    expect(good.ok).toBe(true);
  });
});
