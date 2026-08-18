import { describe, expect, it } from "vitest";
import {
  coachVisibleMessage,
  looksLikeJsonStreamPrefix,
  looksLikeLeakedEnvelope,
  partialJsonStringField,
} from "@/lib/kaios/envelope-text";

const LEAK = `\`\`\`json
{
  "schema_version": "kaios.envelope.v1",
  "coach": "alex",
  "message": "Güzel iş reis, antrenmanı bitirdin.",
  "intent": "programming"
}
\`\`\``;

describe("coachVisibleMessage", () => {
  it("unwraps a fenced KAIOS envelope to the spoken message", () => {
    expect(coachVisibleMessage(LEAK)).toBe("Güzel iş reis, antrenmanı bitirdin.");
  });

  it("unwraps a raw envelope object", () => {
    expect(
      coachVisibleMessage(
        '{"schema_version":"kaios.envelope.v1","coach":"alex","message":"Tamam kral.","intent":"programming"}',
      ),
    ).toBe("Tamam kral.");
  });

  it("leaves normal coach copy alone", () => {
    expect(coachVisibleMessage("Eyvallah kral.")).toBe("Eyvallah kral.");
  });

  it("hides unsavable envelope junk rather than showing JSON", () => {
    expect(
      looksLikeLeakedEnvelope(
        '{"schema_version":"kaios.envelope.v1","coach":"alex"',
      ),
    ).toBe(true);
    expect(
      coachVisibleMessage(
        '{"schema_version":"kaios.envelope.v1","coach":"alex"',
      ),
    ).toBe("");
  });

  it("detects JSON stream prefixes", () => {
    expect(looksLikeJsonStreamPrefix("{")).toBe(true);
    expect(looksLikeJsonStreamPrefix("```json")).toBe(true);
    expect(looksLikeJsonStreamPrefix("Güzel iş")).toBe(false);
  });
});

describe("partialJsonStringField", () => {
  it("reads an in-progress message field from streaming JSON", () => {
    expect(
      partialJsonStringField(
        '{"schema_version":"kaios.envelope.v1","coach":"alex","message":"Bu split',
        "message",
      ),
    ).toBe("Bu split");
  });

  it("unescapes newlines inside a complete message value", () => {
    expect(
      partialJsonStringField(
        '{"message":"Line 1\\nLine 2","intent":"programming"}',
        "message",
      ),
    ).toBe("Line 1\nLine 2");
  });
});
