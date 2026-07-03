import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";

export type GemBalanceDTO = {
  balance: number;
  totalEarned: number;
  totalSpent: number;
};

export async function getGemBalance(userId: string): Promise<GemBalanceDTO> {
  const supabase = await createServerSupabaseClient();

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
