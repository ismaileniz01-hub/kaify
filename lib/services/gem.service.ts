import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api/errors";
import { mapRpcError } from "@/lib/supabase/rpc-errors";
import { logger } from "@/lib/logger";
import type {
  Database,
  GemMutationResult,
  Json,
} from "@/lib/types/database.types";

export type GemTransactionType =
  Database["public"]["Enums"]["gem_transaction_type"];

export type GemMutationParams = {
  userId: string;
  amount: number;
  type: GemTransactionType;
  description: string;
  idempotencyKey: string;
  metadata?: Json;
};

/**
 * Credits gems to a user's ledger.
 *
 * SECURITY: Service-role only (called via the admin client from trusted server
 * code). The amount/type are determined server-side from a legitimate event
 * (check-in handled separately, chat reward, milestone, etc.) — never trusted
 * from the client. Idempotent via (user_id, idempotency_key).
 */
export async function earnGems(
  params: GemMutationParams,
): Promise<GemMutationResult> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase.rpc("earn_gems", {
    p_user_id: params.userId,
    p_amount: params.amount,
    p_type: params.type,
    p_description: params.description,
    p_idempotency_key: params.idempotencyKey,
    p_metadata: params.metadata ?? null,
  });

  if (error) {
    mapRpcError(error, "[gem.service:earn]", "Gem kazanç işlemi başarısız.");
  }
  if (!data) {
    throw new ApiError("INTERNAL_ERROR", "Gem kazanç işlemi başarısız.");
  }

  return data;
}

/**
 * Debits gems from a user's ledger with an atomic balance check.
 *
 * SECURITY: Service-role only. Throws CONFLICT (409) on insufficient balance.
 * Idempotent via (user_id, idempotency_key); concurrent spends are serialized
 * by a per-user advisory lock in the RPC.
 */
export async function spendGems(
  params: GemMutationParams,
): Promise<GemMutationResult> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase.rpc("spend_gems", {
    p_user_id: params.userId,
    p_amount: params.amount,
    p_type: params.type,
    p_description: params.description,
    p_idempotency_key: params.idempotencyKey,
    p_metadata: params.metadata ?? null,
  });

  if (error) {
    mapRpcError(error, "[gem.service:spend]", "Gem harcama işlemi başarısız.");
  }
  if (!data) {
    throw new ApiError("INTERNAL_ERROR", "Gem harcama işlemi başarısız.");
  }

  return data;
}
