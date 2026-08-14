import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AI_FEATURES } from "@/lib/ai/budget";

/**
 * Soak rollback classification: intentional gated flag during canary.
 * Not a P1 defect by itself — only explicit env activates legacy.
 */
describe("KAIOS soak flag classification", () => {
  it("defaults to KAIOS runtime enabled", () => {
    expect(AI_FEATURES.kaiosRuntime).toBe(true);
  });

  it("chat service has no automatic KAIOS→legacy fallback after failure", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/services/chat.service.ts"),
      "utf8",
    );
    // Early return on KAIOS path — legacy is not a catch fallback.
    expect(src).toMatch(
      /if \(AI_FEATURES\.kaiosRuntime\) \{\s*yield\* streamKaiosCoachReply\(params\);\s*return;\s*\}/,
    );
    expect(src).toContain("kaios.runtime.rollback_active");
    expect(src).toContain("LEGACY PATH (reachable only when KAIOS_RUNTIME=false)");

    const start = src.indexOf("async function* streamKaiosCoachReply");
    const end = src.indexOf(
      "When AI_FEATURES.kaiosRuntime is true (default), uses KAIOS orchestrator only",
    );
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const kaiosFn = src.slice(start, end);
    // Body must not invoke legacy prompt builders (imports at file top are OK).
    expect(kaiosFn).not.toMatch(/buildChatSystemPrompt\s*\(/);
    expect(kaiosFn).not.toMatch(/maybeGenerateStructuredCard\s*\(/);
    expect(kaiosFn).not.toMatch(/syncAgents\s*\(/);
  });

  it("team meeting logs rollback when legacy path is taken", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/services/team-chat.service.ts"),
      "utf8",
    );
    expect(src).toContain('path: "legacy_team_meeting"');
    expect(src).toContain("kaios.runtime.rollback_active");
  });

  it("documents removal condition after successful soak", () => {
    const report = readFileSync(
      join(process.cwd(), "kaios/MIGRATION_REPORT.md"),
      "utf8",
    );
    expect(report).toMatch(/removal condition|Delete after soak|after soak/i);
  });
});
