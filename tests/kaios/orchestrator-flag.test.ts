import { describe, expect, it } from "vitest";
import { AI_FEATURES } from "@/lib/ai/budget";

describe("KAIOS orchestrator feature flag", () => {
  it("exposes AI_FEATURES.kaiosRuntime as a boolean", () => {
    expect(typeof AI_FEATURES.kaiosRuntime).toBe("boolean");
  });
});
