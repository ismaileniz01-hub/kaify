import { ApiError } from "@/lib/api/errors";

export const MAX_JSON_BODY_CHAT = 512 * 1024; // 512 KB
export const MAX_JSON_BODY_ANALYZE = 15 * 1024 * 1024; // 15 MB (base64 image)

/**
 * Reads and parses JSON with a hard byte ceiling.
 * Rejects oversized bodies before buffering the entire payload into memory.
 */
export async function parseJsonWithLimit(
  request: Request,
  maxBytes: number,
): Promise<unknown> {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const len = Number.parseInt(contentLength, 10);
    if (!Number.isNaN(len) && len > maxBytes) {
      throw new ApiError("VALIDATION_ERROR", "İstek gövdesi çok büyük.");
    }
  }

  const text = await request.text();
  if (text.length > maxBytes) {
    throw new ApiError("VALIDATION_ERROR", "İstek gövdesi çok büyük.");
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError("VALIDATION_ERROR", "Geçersiz JSON gövdesi.");
  }
}
