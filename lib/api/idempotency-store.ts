import { createHash } from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";

/**
 * Persistent idempotency (Stripe model).
 *
 * When a client supplies an `Idempotency-Key`, the first successful response for
 * a (user, endpoint, key) tuple is cached and replayed on retries — so a
 * dropped connection or double-tap never triggers the side effect twice and
 * always returns the same result. Reusing a key with a different request body
 * is rejected (409), and concurrent in-flight duplicates are rejected (409).
 *
 * Rows are pruned by the daily cron once `expires_at` passes.
 */

export function hashRequest(endpoint: string, body: unknown): string {
  return createHash("sha256")
    .update(endpoint)
    .update("\u0000")
    .update(JSON.stringify(body ?? null))
    .digest("hex");
}

type WithIdempotencyOptions<T> = {
  userId: string;
  endpoint: string;
  /** Client-supplied key. When null, the handler runs without caching. */
  key: string | null;
  requestBody: unknown;
  handler: () => Promise<T>;
};

export async function withIdempotency<T>({
  userId,
  endpoint,
  key,
  requestBody,
  handler,
}: WithIdempotencyOptions<T>): Promise<T> {
  if (!key) {
    return handler();
  }

  const admin = createAdminSupabaseClient();
  const requestHash = hashRequest(endpoint, requestBody);

  const { error: insertError } = await admin.from("idempotency_keys").insert({
    user_id: userId,
    endpoint,
    idempotency_key: key,
    request_hash: requestHash,
    status: "in_progress",
  });

  if (insertError) {
    // 23505 = unique violation -> a row already exists for this tuple.
    if (insertError.code !== "23505") {
      logger.error("idempotency insert failed", {
        endpoint,
        error: insertError.message,
      });
      throw new ApiError("INTERNAL_ERROR", "İşlem kaydedilemedi.");
    }

    const { data: existing } = await admin
      .from("idempotency_keys")
      .select("request_hash, status, response_body")
      .eq("user_id", userId)
      .eq("endpoint", endpoint)
      .eq("idempotency_key", key)
      .maybeSingle();

    if (!existing) {
      throw new ApiError("CONFLICT", "İşlem durumu belirlenemedi. Tekrar deneyin.");
    }
    if (existing.request_hash !== requestHash) {
      throw new ApiError(
        "CONFLICT",
        "Bu Idempotency-Key farklı bir istekle kullanılmış.",
      );
    }
    if (existing.status === "in_progress") {
      throw new ApiError("CONFLICT", "Aynı istek hâlâ işleniyor.");
    }
    return existing.response_body as T;
  }

  try {
    const result = await handler();

    await admin
      .from("idempotency_keys")
      .update({
        status: "completed",
        response_status: 200,
        response_body: result as never,
      })
      .eq("user_id", userId)
      .eq("endpoint", endpoint)
      .eq("idempotency_key", key);

    return result;
  } catch (error) {
    // Roll back the placeholder so the client may retry the failed request.
    await admin
      .from("idempotency_keys")
      .delete()
      .eq("user_id", userId)
      .eq("endpoint", endpoint)
      .eq("idempotency_key", key)
      .eq("status", "in_progress");
    throw error;
  }
}
