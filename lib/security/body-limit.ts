import { ApiError } from "@/lib/api/errors";

/** Align with Vercel serverless request body cap (~4.5 MB). */
export const VERCEL_MAX_BODY_BYTES = 4 * 1024 * 1024;
export const MAX_JSON_BODY_CHAT = 512 * 1024; // 512 KB
export const MAX_JSON_BODY_ANALYZE = VERCEL_MAX_BODY_BYTES;
export const MAX_JSON_BODY_AVATAR = VERCEL_MAX_BODY_BYTES;

async function readTextWithLimit(request: Request, maxBytes: number): Promise<string> {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const len = Number.parseInt(contentLength, 10);
    if (!Number.isNaN(len) && len > maxBytes) {
      throw new ApiError("VALIDATION_ERROR", "İstek gövdesi çok büyük.");
    }
  }

  const body = request.body;
  if (!body) {
    const text = await request.text();
    if (new TextEncoder().encode(text).length > maxBytes) {
      throw new ApiError("VALIDATION_ERROR", "İstek gövdesi çok büyük.");
    }
    return text;
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      try {
        await reader.cancel();
      } catch {
        /* ignore */
      }
      throw new ApiError("VALIDATION_ERROR", "İstek gövdesi çok büyük.");
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

/**
 * Reads and parses JSON with a hard byte ceiling.
 * Rejects oversized Content-Length before reading; otherwise streams until maxBytes.
 */
export async function parseJsonWithLimit(
  request: Request,
  maxBytes: number,
): Promise<unknown> {
  const text = await readTextWithLimit(request, maxBytes);

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError("VALIDATION_ERROR", "Geçersiz JSON gövdesi.");
  }
}
