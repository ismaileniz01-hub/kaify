import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Wave 8 launch closures", () => {
  it("KAIOS chat catch marks quotaSettled after a refund to prevent double refund", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/services/chat.service.ts"),
      "utf8",
    );
    const kaiosFn = src.slice(
      src.indexOf("async function* streamKaiosCoachReply"),
      src.indexOf("When AI_FEATURES.kaiosRuntime is true"),
    );
    expect(kaiosFn).toMatch(/quotaSettled = true/);
    const catchIdx = kaiosFn.indexOf("} catch (error)");
    const finallyIdx = kaiosFn.indexOf("} finally {");
    const catchBlock = kaiosFn.slice(catchIdx, finallyIdx);
    expect(catchBlock).toContain("quotaSettled = true");
  });

  it("KAIOS conversational path does not schedule analytics LLM", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/services/chat.service.ts"),
      "utf8",
    );
    const kaiosFn = src.slice(
      src.indexOf("async function* streamKaiosCoachReply"),
      src.indexOf("When AI_FEATURES.kaiosRuntime is true"),
    );
    expect(kaiosFn).not.toContain("applyCoachAnalyticsFromChat");
  });

  it("404 metadata is noindex", () => {
    const src = readFileSync(join(process.cwd(), "app/not-found.tsx"), "utf8");
    expect(src).toMatch(/index:\s*false/);
    expect(src).not.toContain("use client");
  });
});
