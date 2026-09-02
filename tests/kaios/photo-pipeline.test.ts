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

  it("retries Gemini once when the first envelope is invalid", async () => {
    generateGeminiJson
      .mockResolvedValueOnce({ quality: { score: 8 } })
      .mockResolvedValueOnce(validEnvelope);
    const result = await ModelRouter.analyzeImagePipeline({
      persona: "maya",
      locale: "en",
      image: { base64: "abc", mimeType: "image/jpeg" },
    });
    expect(generateGeminiJson).toHaveBeenCalledTimes(2);
    expect(result.geminiCalls).toBe(2);
    expect(result.summary).toBe("Coach synthesis");
    const retryArgs = generateGeminiJson.mock.calls[1][0] as {
      thinkingLevel?: string;
    };
    expect(retryArgs.thinkingLevel).toBe("LOW");
  });

  it("retries Gemini once after a vision timeout", async () => {
    generateGeminiJson
      .mockRejectedValueOnce(new AiError("AI_TIMEOUT", "Gemini request timed out"))
      .mockResolvedValueOnce(validEnvelope);
    const result = await ModelRouter.analyzeImagePipeline({
      persona: "maya",
      locale: "en",
      image: { base64: "abc", mimeType: "image/jpeg" },
    });
    expect(generateGeminiJson).toHaveBeenCalledTimes(2);
    expect(result.geminiCalls).toBe(2);
    expect(result.summary).toBe("Coach synthesis");
  });

  it("keeps a usable Maya summary when language rewrite still mismatches", async () => {
    const turkish = [
      "Bu tabakta tavuk pilav yoğurt ve bol yeşil salata görünüyor.",
      "Kalori tahminim altı yüz elli, protein otuz beş gram civarında.",
      "Kaydetmemi ister misin acaba?",
    ].join(" ");
    createChatCompletion
      .mockResolvedValueOnce({
        content: turkish,
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      })
      .mockResolvedValueOnce({
        content: turkish,
        usage: { prompt_tokens: 8, completion_tokens: 12, total_tokens: 20 },
      });
    generateGeminiJson.mockResolvedValue(validEnvelope);
    const result = await ModelRouter.analyzeImagePipeline({
      persona: "maya",
      locale: "en",
      image: { base64: "abc", mimeType: "image/jpeg" },
    });
    expect(result.summary).toContain("tavuk pilav");
    expect(createChatCompletion).toHaveBeenCalledTimes(2);
  });
});
