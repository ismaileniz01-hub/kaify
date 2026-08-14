import { describe, expect, it } from "vitest";
import {
  DEEPSEEK_DEFAULT_MODEL,
  GEMINI_DEFAULT_MODEL,
  isAllowedDeepSeekModel,
  isAllowedGeminiModel,
} from "@/lib/ai/models";
import { AiEnvError, getDeepSeekConfig, getGeminiConfig } from "@/lib/ai/env";

describe("KAIOS model config contract", () => {
  it("defaults are the intended production IDs", () => {
    expect(DEEPSEEK_DEFAULT_MODEL).toBe("deepseek-chat");
    expect(GEMINI_DEFAULT_MODEL).toBe("gemini-flash-lite-latest");
    expect(isAllowedDeepSeekModel(DEEPSEEK_DEFAULT_MODEL)).toBe(true);
    expect(isAllowedGeminiModel(GEMINI_DEFAULT_MODEL)).toBe(true);
  });

  it("rejects unknown / obsolete model IDs", () => {
    expect(isAllowedDeepSeekModel("gpt-4o")).toBe(false);
    expect(isAllowedDeepSeekModel("deepseek-chat-old")).toBe(false);
    expect(isAllowedGeminiModel("gemini-pro-vision")).toBe(false);
    expect(isAllowedGeminiModel("gemini-1.5-flash")).toBe(false);
  });

  it("getDeepSeekConfig fails loud on an invalid DEEPSEEK_MODEL", () => {
    const prevKey = process.env.DEEPSEEK_API_KEY;
    const prevModel = process.env.DEEPSEEK_MODEL;
    process.env.DEEPSEEK_API_KEY = "sk-valid-test-key-not-placeholder";
    process.env.DEEPSEEK_MODEL = "not-a-real-model";
    try {
      expect(() => getDeepSeekConfig()).toThrow(AiEnvError);
    } finally {
      if (prevKey === undefined) delete process.env.DEEPSEEK_API_KEY;
      else process.env.DEEPSEEK_API_KEY = prevKey;
      if (prevModel === undefined) delete process.env.DEEPSEEK_MODEL;
      else process.env.DEEPSEEK_MODEL = prevModel;
    }
  });

  it("getGeminiConfig fails loud on an invalid GEMINI_MODEL", () => {
    const prevKey = process.env.GEMINI_API_KEY;
    const prevModel = process.env.GEMINI_MODEL;
    process.env.GEMINI_API_KEY = "AIza-valid-test-key-not-placeholder";
    process.env.GEMINI_MODEL = "gemini-pro-vision";
    try {
      expect(() => getGeminiConfig()).toThrow(AiEnvError);
    } finally {
      if (prevKey === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = prevKey;
      if (prevModel === undefined) delete process.env.GEMINI_MODEL;
      else process.env.GEMINI_MODEL = prevModel;
    }
  });
});
