import { describe, it, expect } from "vitest";
import {
  estimateCostMicroUsd,
  microToUsd,
  inputRatePer1M,
} from "@/lib/ai/cost";

describe("ai/cost", () => {
  it("estimates DeepSeek cost from token usage", () => {
    const result = estimateCostMicroUsd("deepseek", {
      prompt_tokens: 1_000_000,
      completion_tokens: 0,
      total_tokens: 1_000_000,
    });
    expect(result.usdMicro).toBe(Math.round(inputRatePer1M("deepseek") * 1_000_000));
    expect(microToUsd(result.usdMicro)).toBe(inputRatePer1M("deepseek"));
  });

  it("splits total-only usage heuristically", () => {
    const result = estimateCostMicroUsd("gemini", { total_tokens: 1000 });
    expect(result.totalTokens).toBe(1000);
    expect(result.promptTokens + result.completionTokens).toBe(1000);
  });
});
