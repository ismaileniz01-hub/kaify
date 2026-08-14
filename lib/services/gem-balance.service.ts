import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";

export type GemBalanceDTO = {
  balance: number;
  totalEarned: number;
  totalSpent: number;
};

/**
 * Hot-path gem reads MUST use materialized balances.
 * Never read gem_ledger on this path — ledger growth is storage-only until an
 * archive/partition trigger (see Wave 5 report).
 */
export async function getGemBalance(userId: string): Promise<GemBalanceDTO> {
  const supabase = await createServerSupabaseClient();

  const { data: kai, error: kaiError } = await supabase
    .from("user_kai_state")
    .select("gem_balance, gem_total_earned, gem_total_spent")
    .eq("user_id", userId)
    .maybeSingle();

  if (!kaiError && kai && typeof kai.gem_balance === "number") {
    return {
      balance: Number(kai.gem_balance ?? 0),
      totalEarned: Number(kai.gem_total_earned ?? 0),
      totalSpent: Number(kai.gem_total_spent ?? 0),
    };
  }

  const { data, error } = await supabase
    .from("user_gem_balances")
    .select("balance, total_earned, total_spent")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logger.error("[gem-balance.service] error", { error: error.message });
    throw new ApiError("INTERNAL_ERROR", "Gem bakiyesi alınamadı.");
  }

  return {
    balance: Number(data?.balance ?? 0),
    totalEarned: Number(data?.total_earned ?? 0),
    totalSpent: Number(data?.total_spent ?? 0),
  };
}
