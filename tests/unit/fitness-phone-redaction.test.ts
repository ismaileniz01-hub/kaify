import { describe, expect, it } from "vitest";
import { redactPersonalIdentifiers } from "@/lib/ai/prompt-safety";

describe("fitness numerics vs phone redaction", () => {
  const keep = [
    "3x10",
    "225x5",
    "10-12 reps",
    "1800 kcal",
    "80 kg",
    "120/80",
    "RPE 8",
    "RIR 2",
    "week 1-4",
    "tempo 3-1-1-0",
    "protein 150g",
    "70%",
  ];

  it.each(keep)("preserves %s", (sample) => {
    expect(redactPersonalIdentifiers(`Worked ${sample} today`)).not.toContain(
      "[phone redacted]",
    );
  });

  it("redacts E.164 / international numbers", () => {
    expect(redactPersonalIdentifiers("call +90 532 123 45 67")).toContain(
      "[phone redacted]",
    );
    expect(redactPersonalIdentifiers("whatsapp +1 415 555 2671")).toContain(
      "[phone redacted]",
    );
  });

  it("redacts phone-like numbers with phone context", () => {
    expect(redactPersonalIdentifiers("telefon: 0532 123 45 67")).toContain(
      "[phone redacted]",
    );
  });
});
