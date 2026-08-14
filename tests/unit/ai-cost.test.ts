import { describe, it, expect } from "vitest";
import {
  estimateCostMicroUsd,
  microToUsd,
  inputRatePer1M,
  outputRatePer1M,
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

  it("defaults Gemini 3.5 Flash-Lite list rates when env unset", () => {
    const prevIn = process.env.AI_COST_GEMINI_INPUT_PER_1M;
    const prevOut = process.env.AI_COST_GEMINI_OUTPUT_PER_1M;
    delete process.env.AI_COST_GEMINI_INPUT_PER_1M;
    delete process.env.AI_COST_GEMINI_OUTPUT_PER_1M;
    try {
      expect(inputRatePer1M("gemini")).toBe(0.3);
      expect(outputRatePer1M("gemini")).toBe(2.5);
    } finally {
      if (prevIn === undefined) delete process.env.AI_COST_GEMINI_INPUT_PER_1M;
      else process.env.AI_COST_GEMINI_INPUT_PER_1M = prevIn;
      if (prevOut === undefined) delete process.env.AI_COST_GEMINI_OUTPUT_PER_1M;
      else process.env.AI_COST_GEMINI_OUTPUT_PER_1M = prevOut;
    }
  });
});
