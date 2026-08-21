import { describe, expect, it } from "vitest";
import {
  coachRetryLine,
  isSoftCoachFailure,
  looksLikeUnsafeCoachText,
  sanitizeCoachVisibleText,
  scrubCoachLaneVoice,
} from "@/lib/kaios/coach-retry";

describe("sanitizeCoachVisibleText", () => {
  it("leaves a normal coach reply alone", () => {
    expect(sanitizeCoachVisibleText("Eyvallah, bugün 4 set bench.", "tr")).toBe(
      "Eyvallah, bugün 4 set bench.",
    );
  });

  it("replaces leaked error codes with a retry line", () => {
    const out = sanitizeCoachVisibleText(
      "Bir sorun oldu: INTERNAL_ERROR TOOL_EXECUTION_FAILED",
      "tr",
    );
    expect(out).toBe(coachRetryLine("tr"));
    expect(out).not.toMatch(/INTERNAL_ERROR|TOOL_EXECUTION/);
  });

  it("replaces leaked envelope JSON instead of showing schema labels", () => {
    const out = sanitizeCoachVisibleText(
      '{"schema_version":"kaios.envelope.v1","coach":"maya","error":"FAILED"}',
      "en",
    );
    expect(out).toBe(coachRetryLine("en"));
    expect(out).not.toContain("schema_version");
  });

  it("does not treat ordinary failure talk as an error leak", () => {
    expect(
      sanitizeCoachVisibleText("Last set failed at 80kg, drop the load.", "en"),
    ).toBe("Last set failed at 80kg, drop the load.");
  });

  it("strips Alex gym-bark nicknames from Maya, Leo, and Kai", () => {
    expect(
      sanitizeCoachVisibleText("Selam reis, protein hedefin 150.", "tr", "maya"),
    ).toBe("Selam, protein hedefin 150.");
    expect(scrubCoachLaneVoice("Nice work bro, calves are lagging.", "leo")).toBe(
      "Nice work, calves are lagging.",
    );
    expect(scrubCoachLaneVoice("Selam kanka, skorların durağan.", "leo")).toBe(
      "Selam, skorların durağan.",
    );
    expect(scrubCoachLaneVoice("Tamam kral, yarın gideriz.", "kai")).toBe(
      "Tamam, yarın gideriz.",
    );
    expect(sanitizeCoachVisibleText("Hadi reis, bench zamanı.", "tr", "alex")).toBe(
      "Hadi reis, bench zamanı.",
    );
  });
});

describe("isSoftCoachFailure", () => {
  it("turns INTERNAL_ERROR into a coach retry", () => {
    expect(isSoftCoachFailure("INTERNAL_ERROR")).toBe(true);
    expect(isSoftCoachFailure("STREAM_ERROR")).toBe(true);
    expect(isSoftCoachFailure("FORBIDDEN")).toBe(true);
  });

  it("keeps quota and auth as real errors", () => {
    expect(isSoftCoachFailure("UNAUTHORIZED")).toBe(false);
    expect(isSoftCoachFailure("VALIDATION_ERROR")).toBe(false);
    expect(
      isSoftCoachFailure("QUOTA_EXCEEDED", { resource: "text_tokens" }),
    ).toBe(false);
    expect(
      isSoftCoachFailure("FORBIDDEN", { resource: "maya_photo" }),
    ).toBe(false);
  });
});

describe("looksLikeUnsafeCoachText", () => {
  it("flags empty and TOOL_RESULTS leaks", () => {
    expect(looksLikeUnsafeCoachText("   ")).toBe(true);
    expect(looksLikeUnsafeCoachText("TOOL_RESULTS: FAILED")).toBe(true);
  });
});
