import { describe, expect, it } from "vitest";
import {
  DEEPSEEK_DEFAULT_MODEL,
  GEMINI_DEFAULT_MODEL,
  GEMINI_DEFAULT_THINKING_LEVEL,
  gemini25ThinkingBudget,
  isAllowedDeepSeekModel,
  isAllowedGeminiModel,
  isGemini25FlashModel,
  isGemini3Model,
} from "@/lib/ai/models";
import { AiEnvError, getDeepSeekConfig, getGeminiConfig } from "@/lib/ai/env";
import { buildGeminiGenerationConfig } from "@/lib/ai/gemini.client";

describe("KAIOS model config contract", () => {
  it("defaults are the intended production IDs", () => {
    expect(DEEPSEEK_DEFAULT_MODEL).toBe("deepseek-chat");
    expect(GEMINI_DEFAULT_MODEL).toBe("gemini-2.5-flash");
    expect(GEMINI_DEFAULT_THINKING_LEVEL).toBe("MEDIUM");
    expect(isAllowedDeepSeekModel(DEEPSEEK_DEFAULT_MODEL)).toBe(true);
    expect(isAllowedGeminiModel(GEMINI_DEFAULT_MODEL)).toBe(true);
    expect(isGemini25FlashModel(GEMINI_DEFAULT_MODEL)).toBe(true);
    expect(isGemini3Model(GEMINI_DEFAULT_MODEL)).toBe(false);
  });

  it("rejects unknown / obsolete model IDs", () => {
    expect(isAllowedDeepSeekModel("gpt-4o")).toBe(false);
    expect(isAllowedDeepSeekModel("deepseek-chat-old")).toBe(false);
    expect(isAllowedGeminiModel("gemini-pro-vision")).toBe(false);
    expect(isAllowedGeminiModel("gemini-1.5-flash")).toBe(false);
  });

  it("Gemini 2.5 Flash generation config uses thinkingBudget and temperature", () => {
    const config = buildGeminiGenerationConfig("gemini-2.5-flash", {
      temperature: 0.2,
      thinkingLevel: "MEDIUM",
    });
    expect(config).toEqual({
      responseMimeType: "application/json",
      maxOutputTokens: 8192,
      temperature: 0.2,
      thinkingConfig: { thinkingBudget: gemini25ThinkingBudget("MEDIUM") },
    });
    expect(config).not.toHaveProperty("thinkingLevel");
  });

  it("Gemini 2.5 Flash retry (LOW) disables thinking so JSON can fit", () => {
    const config = buildGeminiGenerationConfig("gemini-2.5-flash", {
      thinkingLevel: "LOW",
    });
    expect(config.thinkingConfig).toEqual({ thinkingBudget: 0 });
  });

  it("Gemini 3 generation config uses thinking medium and omits temperature", () => {
    const config = buildGeminiGenerationConfig("gemini-3.5-flash-lite", {
      temperature: 0.2,
      thinkingLevel: "MEDIUM",
    });
    expect(config).toEqual({
      responseMimeType: "application/json",
      maxOutputTokens: 8192,
      thinkingConfig: { thinkingLevel: "medium" },
    });
    expect(config).not.toHaveProperty("temperature");
  });

  it("legacy Gemini 2 Flash-Lite generation config keeps temperature without thinking", () => {
    const config = buildGeminiGenerationConfig("gemini-2.5-flash-lite", {
      temperature: 0.2,
    });
    expect(config).toEqual({
      responseMimeType: "application/json",
      maxOutputTokens: 8192,
      temperature: 0.2,
    });
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

  it("getGeminiConfig fails loud on an invalid GEMINI_THINKING_LEVEL", () => {
    const prevKey = process.env.GEMINI_API_KEY;
    const prevThink = process.env.GEMINI_THINKING_LEVEL;
    process.env.GEMINI_API_KEY = "AIza-valid-test-key-not-placeholder";
    process.env.GEMINI_THINKING_LEVEL = "turbo";
    try {
      expect(() => getGeminiConfig()).toThrow(AiEnvError);
    } finally {
      if (prevKey === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = prevKey;
      if (prevThink === undefined) delete process.env.GEMINI_THINKING_LEVEL;
      else process.env.GEMINI_THINKING_LEVEL = prevThink;
    }
  });
});
