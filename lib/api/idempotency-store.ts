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

export type IdempotencyClaim<T> =
  | { kind: "execute" }
  | { kind: "replay"; body: T }
  | { kind: "passthrough" };

export async function claimIdempotency<T>(params: {
  userId: string;
  endpoint: string;
  key: string | null;
  requestBody: unknown;
}): Promise<IdempotencyClaim<T>> {
  if (!params.key) return { kind: "passthrough" };

  const admin = createAdminSupabaseClient();
  const requestHash = hashRequest(params.endpoint, params.requestBody);

  const { error: insertError } = await admin.from("idempotency_keys").insert({
    user_id: params.userId,
    endpoint: params.endpoint,
    idempotency_key: params.key,
    request_hash: requestHash,
    status: "in_progress",
  });

  if (!insertError) {
    logger.info("idempotency.claimed", { endpoint: params.endpoint });
    return { kind: "execute" };
  }

  if (insertError.code !== "23505") {
    logger.error("idempotency insert failed", {
      endpoint: params.endpoint,
      error: insertError.message,
    });
    throw new ApiError("INTERNAL_ERROR", "İşlem kaydedilemedi.");
  }

  const { data: existing } = await admin
    .from("idempotency_keys")
    .select("request_hash, status, response_body")
    .eq("user_id", params.userId)
    .eq("endpoint", params.endpoint)
    .eq("idempotency_key", params.key)
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
  logger.info("idempotency.replay", { endpoint: params.endpoint });
  return { kind: "replay", body: existing.response_body as T };
}

export async function completeIdempotency(
  userId: string,
  endpoint: string,
  key: string | null,
  result: unknown,
): Promise<void> {
  if (!key) return;
  const admin = createAdminSupabaseClient();
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
}

export async function releaseIdempotency(
  userId: string,
  endpoint: string,
  key: string | null,
): Promise<void> {
  if (!key) return;
  const admin = createAdminSupabaseClient();
  await admin
    .from("idempotency_keys")
    .delete()
    .eq("user_id", userId)
    .eq("endpoint", endpoint)
    .eq("idempotency_key", key)
    .eq("status", "in_progress");
}

export async function withIdempotency<T>({
  userId,
  endpoint,
  key,
  requestBody,
  handler,
}: WithIdempotencyOptions<T>): Promise<T> {
  const claim = await claimIdempotency<T>({ userId, endpoint, key, requestBody });
  if (claim.kind === "replay") return claim.body;
  if (claim.kind === "passthrough") return handler();

  try {
    const result = await handler();
    await completeIdempotency(userId, endpoint, key, result);
    return result;
  } catch (error) {
    await releaseIdempotency(userId, endpoint, key);
    throw error;
  }
}
