/** Shared, transport-agnostic AI types. */

export type ChatRole = "system" | "user" | "assistant";

export type ChatTurn = {
  role: ChatRole;
  content: string;
};

/** DeepSeek/OpenAI-compatible usage object (cache fields optional). */
export type TokenUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  prompt_cache_hit_tokens?: number;
  prompt_cache_miss_tokens?: number;
};

/** Events emitted by the streaming text generator. */
export type StreamEvent =
  | { type: "delta"; content: string }
  | { type: "done"; usage: TokenUsage | null };

/** Inline image payload handed to the vision model. */
export type ImageInput = {
  base64: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
};
