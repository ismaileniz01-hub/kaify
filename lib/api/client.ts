import type { ApiResponseBody } from "@/lib/api/response";
import { CSRF_HEADER_NAME, readCsrfCookieFromDocument } from "@/lib/security/csrf-client";
export { resolveApiPath } from "@/lib/api/resolve-api-path";
import { resolveApiPath } from "@/lib/api/resolve-api-path";
import { withRetry } from "@/lib/resilience/retry";
import { UpstreamHttpError } from "@/lib/resilience/error-taxonomy";

export const IDEMPOTENCY_HEADER = "Idempotency-Key";

function csrfHeaders(): HeadersInit {
  const token = readCsrfCookieFromDocument();
  return token ? { [CSRF_HEADER_NAME]: token } : {};
}

function mergeHeaders(init?: HeadersInit): HeadersInit {
  return { ...csrfHeaders(), ...(init ?? {}) };
}

function isIdempotentMethod(method: string): boolean {
  return method === "GET" || method === "HEAD";
}

function headerMap(init?: HeadersInit): Record<string, string> {
  if (!init) return {};
  if (init instanceof Headers) {
    const out: Record<string, string> = {};
    init.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }
  if (Array.isArray(init)) {
    return Object.fromEntries(init);
  }
  return { ...init };
}

/** Stable UUID for one logical mutation; retries must reuse the same value. */
export function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function resolveMutationIdempotencyKey(
  method: string,
  headers: Record<string, string>,
): string | undefined {
  if (isIdempotentMethod(method)) return undefined;
  const existing =
    headers[IDEMPOTENCY_HEADER] ??
    headers["idempotency-key"] ??
    headers["Idempotency-key"];
  if (typeof existing === "string" && existing.trim()) return existing.trim();
  return createIdempotencyKey();
}

/** Typed fetch wrapper for Kaify Ai API routes (cookie session). Soft-retries GETs. */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResponseBody<T>> {
  const method = (init?.method ?? "GET").toUpperCase();
  const idempotent = isIdempotentMethod(method);
  const baseHeaders = headerMap(mergeHeaders(init?.headers));
  const idempotencyKey = resolveMutationIdempotencyKey(method, baseHeaders);
  if (idempotencyKey) {
    baseHeaders[IDEMPOTENCY_HEADER] = idempotencyKey;
  }

  return withRetry(
    async () => {
      let response: Response;
      try {
        response = await fetch(resolveApiPath(path), {
          ...init,
          method,
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...baseHeaders,
          },
        });
      } catch (error) {
        // Network / DNS — taxonomy marks retryable.
        throw error;
      }

      if (
        idempotent &&
        (response.status === 502 || response.status === 503 || response.status === 504)
      ) {
        throw new UpstreamHttpError(response.status, `API ${response.status}`);
      }

      const json = (await response.json()) as ApiResponseBody<T>;
      return json;
    },
    {
      retries: idempotent ? 2 : 1,
      baseDelayMs: 200,
      maxDelayMs: 1500,
      signal: init?.signal ?? undefined,
      // Mutating calls: only retry pure network failures (no HTTP 5xx retry).
      isRetryable: (error) => {
        if (error instanceof UpstreamHttpError) return idempotent;
        if (error instanceof TypeError) return true;
        if (error instanceof Error) {
          const msg = error.message.toLowerCase();
          return (
            msg.includes("fetch failed") ||
            msg.includes("network") ||
            msg.includes("failed to fetch")
          );
        }
        return false;
      },
    },
  );
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
    userMessageId?: string | null;
    messageType?: string | null;
    payload?: unknown;
    warning_trigger?: string | null;
    /** Full assistant text; used if rAF-coalesced deltas have not flushed yet. */
    content?: string | null;
  }) => void;
  /** Optional rich-card patch after `done` (meal plan / score cards). */
  onCard?: (data: {
    messageId: string | null;
    messageType?: string | null;
    payload?: unknown;
  }) => void;
  /** Receives a stable API error CODE (translate on the UI via apiErrorMessage). */
  onError: (code: string, details?: unknown) => void;
};

/** POST /api/chat/[coachId] — consumes SSE stream. */
export async function streamChatMessage(
  coachId: string,
  message: string,
  handlers: ChatStreamHandlers,
  signal?: AbortSignal,
  idempotencyKey?: string,
  clientMessageId?: string,
): Promise<void> {
  const key = idempotencyKey ?? createIdempotencyKey();
  const response = await fetch(resolveApiPath(`/api/chat/${coachId}`), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      [IDEMPOTENCY_HEADER]: key,
      ...csrfHeaders(),
    },
    body: JSON.stringify({
      message,
      ...(clientMessageId ? { clientMessageId } : {}),
    }),
    signal,
  });

  if (!response.ok) {
    try {
      const json = (await response.json()) as ApiResponseBody<never>;
      if (!json.success) {
        handlers.onError(json.error.code ?? "INTERNAL_ERROR", json.error.details);
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

  const dispatchBlock = (block: string) => {
    const lines = block.split("\n");
    let event = "message";
    let data = "";

    for (const line of lines) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      if (line.startsWith("data:")) data = line.slice(5).trim();
    }

    if (!data) return;

    try {
      const parsed = JSON.parse(data) as Record<string, unknown>;
      if (event === "delta" && typeof parsed.content === "string") {
        handlers.onDelta(parsed.content);
      } else if (event === "done") {
        handlers.onDone({
          messageId: (parsed.messageId as string | null) ?? null,
          userMessageId: (parsed.userMessageId as string | null) ?? null,
          messageType: (parsed.messageType as string | null) ?? null,
          payload: parsed.payload,
          warning_trigger: (parsed.warning_trigger as string | null) ?? null,
          content:
            typeof parsed.content === "string" ? parsed.content : null,
        });
      } else if (event === "card") {
        handlers.onCard?.({
          messageId: (parsed.messageId as string | null) ?? null,
          messageType: (parsed.messageType as string | null) ?? null,
          payload: parsed.payload,
        });
      } else if (event === "error") {
        const code =
          typeof parsed.code === "string" ? parsed.code : "INTERNAL_ERROR";
        handlers.onError(code);
      }
    } catch {
      // skip malformed SSE block
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";

    for (const block of blocks) dispatchBlock(block);
  }

  buffer += decoder.decode();
  if (buffer.trim()) dispatchBlock(buffer);
}
