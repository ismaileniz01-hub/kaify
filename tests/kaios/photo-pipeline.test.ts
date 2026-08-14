import { beforeEach, describe, expect, it, vi } from "vitest";

const generateGeminiJson = vi.fn();
const createChatCompletion = vi.fn();

vi.mock("@/lib/ai/gemini.client", () => ({
  generateGeminiJson: (...args: unknown[]) => generateGeminiJson(...args),
}));

vi.mock("@/lib/ai/deepseek.client", () => ({
  createChatCompletion: (...args: unknown[]) => createChatCompletion(...args),
  streamChatCompletion: vi.fn(),
}));

import { ModelRouter } from "@/lib/ai/model-router";
import { AiError } from "@/lib/ai/errors";

const validEnvelope = {
  quality: { score: 8, issues: [], tips: [] },
  observations: {
    visible_muscles: ["chests"],
    scores: { chests: 72 },
    overall_score: 72,
    food_analysis: {
      calories: 500,
      protein: 40,
      carb: 30,
      fat: 20,
    },
    ambiguity: [],
  },
};

describe("photo pipeline provider calls", () => {
  beforeEach(() => {
    generateGeminiJson.mockReset();
    createChatCompletion.mockReset();
    createChatCompletion.mockResolvedValue({
      content: "Coach synthesis",
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    });
  });

  it("Maya successful photo: 1 Gemini + 1 DeepSeek, no quality_gate", async () => {
    generateGeminiJson.mockResolvedValue(validEnvelope);
    const result = await ModelRouter.analyzeImagePipeline({
      userId: "u1",
      persona: "maya",
      locale: "en",
      image: { base64: "abc", mimeType: "image/jpeg" },
    });
    expect(generateGeminiJson).toHaveBeenCalledTimes(1);
    expect(createChatCompletion).toHaveBeenCalledTimes(1);
    expect(result.geminiCalls).toBe(1);
    expect(result.deepseekCalls).toBe(1);
    const geminiCtx = generateGeminiJson.mock.calls[0][0] as {
      usageContext: { operation: string };
    };
    expect(geminiCtx.usageContext.operation).toBe("vision");
    const dsCtx = createChatCompletion.mock.calls[0][1] as {
      usageContext: { operation: string };
    };
    expect(dsCtx.usageContext.operation).toBe("synthesis");
  });

  it("Leo successful photo: 1 Gemini + 1 DeepSeek", async () => {
    generateGeminiJson.mockResolvedValue(validEnvelope);
    const result = await ModelRouter.analyzeImagePipeline({
      userId: "u1",
      persona: "leo",
      locale: "en",
      image: { base64: "abc", mimeType: "image/jpeg" },
    });
    expect(generateGeminiJson).toHaveBeenCalledTimes(1);
    expect(createChatCompletion).toHaveBeenCalledTimes(1);
    expect(result.geminiCalls).toBe(1);
    expect(result.deepseekCalls).toBe(1);
  });

  it("insufficient quality stops before DeepSeek", async () => {
    generateGeminiJson.mockResolvedValue({
      quality: { score: 2, issues: ["dark"], tips: ["light"] },
      observations: validEnvelope.observations,
    });
    await expect(
      ModelRouter.analyzeImagePipeline({
        persona: "leo",
        locale: "en",
        image: { base64: "abc", mimeType: "image/jpeg" },
      }),
    ).rejects.toMatchObject({ code: "AI_LOW_QUALITY" } satisfies Partial<AiError>);
    expect(createChatCompletion).not.toHaveBeenCalled();
  });
});
