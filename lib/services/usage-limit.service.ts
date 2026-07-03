import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import type { UsageCheckResult, UsageResource } from "@/lib/types/database.types";
import { mapUsageStatus, type UsageStatusDTO } from "@/lib/types/domain.types";

/**
 * Returns the authenticated user's full limit status across all resources.
 * Read-only; user-scoped via auth.uid() in the RPC.
 */
export async function getUsageStatus(): Promise<UsageStatusDTO> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("get_usage_status", {});

  if (error) {
    if (error.code === "P0001" || error.code === "P0002") {
      throw new ApiError("CONFLICT", error.message);
    }
    logger.error("[usage-limit.service:status] rpc error", { error: error.message });
    throw new ApiError("INTERNAL_ERROR", "Kullanım durumu alınamadı.");
  }
  if (!data) {
    throw new ApiError("INTERNAL_ERROR", "Kullanım durumu alınamadı.");
  }

  return mapUsageStatus(data);
}

export type CheckUsageParams = {
  userId: string;
  resource: UsageResource;
  amount?: number;
};

/**
 * Atomically checks and increments a usage counter.
 *
 * SECURITY: Service-role only (admin client). Called by chat / photo routes
 * after authenticating the user and determining the legitimate consumption.
 * Returns `allowed=false` with `warning_trigger='LIMIT_100'` when the resource
 * is exhausted; surfaces `LIMIT_80` once usage reaches 80%.
 */
export async function checkAndIncrementUsage(
  params: CheckUsageParams,
): Promise<UsageCheckResult> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase.rpc("check_and_increment_usage", {
    p_user_id: params.userId,
    p_resource: params.resource,
    p_amount: params.amount ?? 1,
  });

  if (error) {
    if (error.code === "P0001" || error.code === "P0002") {
      throw new ApiError("VALIDATION_ERROR", error.message);
    }
    logger.error("[usage-limit.service:check] rpc error", { error: error.message });
    throw new ApiError("INTERNAL_ERROR", "Kullanım limiti kontrol edilemedi.");
  }
  if (!data) {
    throw new ApiError("INTERNAL_ERROR", "Kullanım limiti kontrol edilemedi.");
  }

  return data;
}

/** Returns reserved quota after a failed AI operation. Service-role only. */
export async function refundUsage(params: CheckUsageParams): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const amount = params.amount ?? 1;

  const { error } = await supabase.rpc("refund_usage", {
    p_user_id: params.userId,
    p_resource: params.resource,
    p_amount: amount,
  });

  if (error) {
    logger.error("[usage-limit.service:refund] rpc error", { error: error.message });
  }
}
