import { describe, expect, it } from "vitest";
import { imageQualitySchema } from "@/lib/validations/analysis.schema";
import { normalizeImageQualityObservation } from "@/lib/kaios/vision/normalize";

describe("image quality fail-closed", () => {
  it("rejects missing score instead of defaulting to a passing 7", () => {
    expect(imageQualitySchema.safeParse({ issues: [], tips: [] }).success).toBe(
      false,
    );
    const gate = normalizeImageQualityObservation({ issues: [], tips: [] });
    expect(gate.status).toBe("INVALID_PROVIDER_OUTPUT");
  });

  it("rejects NaN / wrong type / out of range", () => {
    expect(imageQualitySchema.safeParse({ score: Number.NaN }).success).toBe(
      false,
    );
    expect(imageQualitySchema.safeParse({ score: "blurry" }).success).toBe(
      false,
    );
    expect(imageQualitySchema.safeParse({ score: 0 }).success).toBe(false);
    expect(imageQualitySchema.safeParse({ score: 11 }).success).toBe(false);
    expect(normalizeImageQualityObservation({ score: "nope" }).status).toBe(
      "INVALID_PROVIDER_OUTPUT",
    );
  });

  it("marks a finite low score as insufficient, not valid", () => {
    const parsed = imageQualitySchema.safeParse({
      score: 2,
      issues: ["blur"],
      tips: ["more light"],
    });
    expect(parsed.success).toBe(true);
    const gate = normalizeImageQualityObservation({ score: 2, issues: ["blur"] });
    expect(gate.status).toBe("INSUFFICIENT_QUALITY");
  });
});
