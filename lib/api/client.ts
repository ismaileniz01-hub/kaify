import type { ApiResponseBody } from "@/lib/api/response";

/** Typed fetch wrapper for Kaify API routes (cookie session). */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResponseBody<T>> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const json = (await response.json()) as ApiResponseBody<T>;
  return json;
}

export async function apiGet<T>(path: string): Promise<T> {
  const body = await apiFetch<T>(path, { method: "GET" });
  if (!body.success) {
    throw new ApiClientError(body.error.code, body.error.message, body.error.details);
  }
  return body.data;
}

export async function apiPost<T>(
  path: string,
  payload?: unknown,
  headers?: HeadersInit,
): Promise<T> {
  const body = await apiFetch<T>(path, {
    method: "POST",
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
    headers,
  });
  if (!body.success) {
    throw new ApiClientError(body.error.code, body.error.message, body.error.details);
  }
  return body.data;
}

export async function apiPatch<T>(path: string, payload: unknown): Promise<T> {
  const body = await apiFetch<T>(path, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  if (!body.success) {
    throw new ApiClientError(body.error.code, body.error.message, body.error.details);
  }
  return body.data;
}

export async function apiDelete<T>(path: string, payload?: unknown): Promise<T> {
  const body = await apiFetch<T>(path, {
    method: "DELETE",
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
  });
  if (!body.success) {
    throw new ApiClientError(body.error.code, body.error.message, body.error.details);
  }
  return body.data;
}

export class ApiClientError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.details = details;
  }
}

export type ChatStreamHandlers = {
  onDelta: (content: string) => void;
  onDone: (data: {
    messageId: string | null;
    messageType?: string | null;
    payload?: unknown;
    warning_trigger?: string | null;
  }) => void;
  /** Receives a stable API error CODE (translate on the UI via apiErrorMessage). */
  onError: (code: string) => void;
};

/** POST /api/chat/[coachId] — consumes SSE stream. */
export async function streamChatMessage(
  coachId: string,
  message: string,
  handlers: ChatStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(`/api/chat/${coachId}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
    signal,
  });

  if (!response.ok) {
    try {
      const json = (await response.json()) as ApiResponseBody<never>;
      if (!json.success) {
        handlers.onError(json.error.code ?? "INTERNAL_ERROR");
        return;
      }
    } catch {
      handlers.onError("INTERNAL_ERROR");
    }
    return;
  }

  if (!response.body) {
    handlers.onError("INTERNAL_ERROR");
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";

    for (const block of blocks) {
      const lines = block.split("\n");
      let event = "message";
      let data = "";

      for (const line of lines) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        if (line.startsWith("data:")) data = line.slice(5).trim();
      }

      if (!data) continue;

      try {
        const parsed = JSON.parse(data) as Record<string, unknown>;
        if (event === "delta" && typeof parsed.content === "string") {
          handlers.onDelta(parsed.content);
        } else if (event === "done") {
          handlers.onDone({
            messageId: (parsed.messageId as string | null) ?? null,
            messageType: (parsed.messageType as string | null) ?? null,
            payload: parsed.payload,
            warning_trigger: (parsed.warning_trigger as string | null) ?? null,
          });
        } else if (event === "error") {
          const code =
            typeof parsed.code === "string" ? parsed.code : "INTERNAL_ERROR";
          handlers.onError(code);
        }
      } catch {
        // skip malformed SSE block
      }
    }
  }
}
