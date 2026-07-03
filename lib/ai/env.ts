import { z } from "zod";

/**
 * AI provider configuration — SERVER ONLY.
 *
 * Keys live exclusively in `.env.local` (git-ignored). These helpers validate
 * presence/shape with Zod and refuse placeholder values. They must never be
 * imported from a Client Component; `assertServerRuntime()` guards against it.
 */

const PLACEHOLDER_PATTERNS = ["your_", "_here", "changeme", "replace_me"] as const;

function isPlaceholderValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) {
    return true;
  }
  return PLACEHOLDER_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function keySchema(name: string) {
  return z
    .string()
    .trim()
    .min(1, `${name} is required`)
    .refine((value) => !isPlaceholderValue(value), `${name} is still a placeholder`);
}

export class AiEnvError extends Error {
  readonly code = "AI_ENV_INVALID";

  constructor(message: string) {
    super(message);
    this.name = "AiEnvError";
  }
}

function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join("; ");
}

export function assertServerRuntime(caller: string): void {
  if (typeof window !== "undefined") {
    throw new AiEnvError(
      `${caller} must only run on the server. AI provider keys must never reach the browser.`,
    );
  }
}

// ---------------------------------------------------------------------------
// DeepSeek (text logic & synthesis)
// ---------------------------------------------------------------------------

const deepSeekConfigSchema = z.object({
  apiKey: keySchema("DEEPSEEK_API_KEY"),
  baseUrl: z.string().url("DEEPSEEK_BASE_URL must be a valid URL"),
  model: z.string().min(1, "DEEPSEEK_MODEL is required"),
});

export type DeepSeekConfig = z.infer<typeof deepSeekConfigSchema>;

export function getDeepSeekConfig(): DeepSeekConfig {
  assertServerRuntime("getDeepSeekConfig");

  const candidate = {
    apiKey: process.env.DEEPSEEK_API_KEY ?? "",
    baseUrl: (process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com").trim(),
    model: (process.env.DEEPSEEK_MODEL ?? "deepseek-chat").trim(),
  };

  const parsed = deepSeekConfigSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new AiEnvError(formatZodError(parsed.error));
  }
  return parsed.data;
}

// ---------------------------------------------------------------------------
// Gemini (vision & measurement)
// ---------------------------------------------------------------------------

const geminiConfigSchema = z.object({
  apiKey: keySchema("GEMINI_API_KEY"),
  model: z.string().min(1, "GEMINI_MODEL is required"),
});

export type GeminiConfig = z.infer<typeof geminiConfigSchema>;

export function getGeminiConfig(): GeminiConfig {
  assertServerRuntime("getGeminiConfig");

  const candidate = {
    apiKey: process.env.GEMINI_API_KEY ?? "",
    // "Gemini 3.1 Flash-Lite" — alias resolves to the latest flash-lite model.
    model: (process.env.GEMINI_MODEL ?? "gemini-flash-lite-latest").trim(),
  };

  const parsed = geminiConfigSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new AiEnvError(formatZodError(parsed.error));
  }
  return parsed.data;
}
