import { describe, expect, it } from "vitest";
import { interpretVisionEnvelope } from "@/lib/validations/analysis.schema";

const MIN = 3;

const goodObservations = {
  visible_muscles: ["chests"],
  scores: { chests: 70 },
  overall_score: 70,
  food_analysis: null,
};

describe("combined vision envelope fail-closed", () => {
  it("missing quality → INVALID_PROVIDER_OUTPUT", () => {
    expect(
      interpretVisionEnvelope({ observations: goodObservations }, MIN).status,
    ).toBe("INVALID_PROVIDER_OUTPUT");
  });

  it("wrong quality type → INVALID_PROVIDER_OUTPUT", () => {
    expect(
      interpretVisionEnvelope(
        { quality: "fine", observations: goodObservations },
        MIN,
      ).status,
    ).toBe("INVALID_PROVIDER_OUTPUT");
  });

  it("NaN score → INVALID_PROVIDER_OUTPUT", () => {
    expect(
      interpretVisionEnvelope(
        { quality: { score: Number.NaN }, observations: goodObservations },
        MIN,
      ).status,
    ).toBe("INVALID_PROVIDER_OUTPUT");
  });

  it("out of range score → INVALID_PROVIDER_OUTPUT", () => {
    expect(
      interpretVisionEnvelope(
        { quality: { score: 11 }, observations: goodObservations },
        MIN,
      ).status,
    ).toBe("INVALID_PROVIDER_OUTPUT");
    expect(
      interpretVisionEnvelope(
        { quality: { score: 0 }, observations: goodObservations },
        MIN,
      ).status,
    ).toBe("INVALID_PROVIDER_OUTPUT");
  });

  it("missing observations → INVALID_PROVIDER_OUTPUT", () => {
    expect(interpretVisionEnvelope({ quality: { score: 8 } }, MIN).status).toBe(
      "INVALID_PROVIDER_OUTPUT",
    );
  });

  it("malformed JSON object → INVALID_PROVIDER_OUTPUT", () => {
    expect(interpretVisionEnvelope("not-json", MIN).status).toBe(
      "INVALID_PROVIDER_OUTPUT",
    );
    expect(interpretVisionEnvelope(null, MIN).status).toBe(
      "INVALID_PROVIDER_OUTPUT",
    );
  });

  it("does not default a passing score", () => {
    const r = interpretVisionEnvelope({ issues: [], tips: [] }, MIN);
    expect(r.status).toBe("INVALID_PROVIDER_OUTPUT");
  });

  it("finite low score → INSUFFICIENT_QUALITY", () => {
    const r = interpretVisionEnvelope(
      {
        quality: { score: 2, issues: ["blur"], tips: ["light"] },
        observations: goodObservations,
      },
      MIN,
    );
    expect(r.status).toBe("INSUFFICIENT_QUALITY");
  });

  it("valid high-quality envelope → VALID", () => {
    const r = interpretVisionEnvelope(
      {
        quality: { score: 8, issues: [], tips: [] },
        observations: goodObservations,
      },
      MIN,
    );
    expect(r.status).toBe("VALID");
    if (r.status === "VALID") {
      expect(r.analysis.scores.chests).toBe(70);
    }
  });
});
