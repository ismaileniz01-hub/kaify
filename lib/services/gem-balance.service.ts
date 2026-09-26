import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { invalidateSessionSliceCaches } from "@/lib/cache/invalidate";

export type GemBalanceDTO = {
  balance: number;
  totalEarned: number;
  totalSpent: number;
};

export function pickAuthoritativeGemBalance(
  kai: GemBalanceDTO | null,
  ledger: GemBalanceDTO | null,
): { dto: GemBalanceDTO; needsRepair: boolean } {
  if (!ledger && !kai) {
    return {
      dto: { balance: 0, totalEarned: 0, totalSpent: 0 },
      needsRepair: false,
    };
  }
  if (!ledger) {
    return { dto: kai as GemBalanceDTO, needsRepair: false };
  }
  if (!kai) {
    return { dto: ledger, needsRepair: ledger.balance > 0 };
  }
  const drifted =
    kai.balance !== ledger.balance ||
    kai.totalEarned !== ledger.totalEarned ||
    kai.totalSpent !== ledger.totalSpent;
  return { dto: drifted ? ledger : kai, needsRepair: drifted };
}

/**
 * Hot-path gem reads MUST use materialized balances.
 * Never read gem_ledger on this path — ledger growth is storage-only until an
 * archive/partition trigger (see Wave 5 report).
 *
 * If kai_state drifted from the ledger view (streak/check-in wrote the audit
 * trail without updating kai), return the ledger total and repair kai_state.
 */
export async function getGemBalance(userId: string): Promise<GemBalanceDTO> {
  const supabase = await createServerSupabaseClient();

  const [kaiResult, ledgerResult] = await Promise.all([
    supabase
      .from("user_kai_state")
      .select("gem_balance, gem_total_earned, gem_total_spent")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("user_gem_balances")
      .select("balance, total_earned, total_spent")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (kaiResult.error) {
    logger.warn("[gem-balance.service] kai read error", {
      error: kaiResult.error.message,
    });
  }
  if (ledgerResult.error) {
    logger.error("[gem-balance.service] error", {
      error: ledgerResult.error.message,
    });
    if (!kaiResult.data) {
      throw new ApiError("INTERNAL_ERROR", "Gem bakiyesi alınamadı.");
    }
  }

  const kai =
    !kaiResult.error &&
    kaiResult.data &&
    typeof kaiResult.data.gem_balance === "number"
      ? {
          balance: Number(kaiResult.data.gem_balance ?? 0),
          totalEarned: Number(kaiResult.data.gem_total_earned ?? 0),
          totalSpent: Number(kaiResult.data.gem_total_spent ?? 0),
        }
      : null;

  const ledger = ledgerResult.data
    ? {
        balance: Number(ledgerResult.data.balance ?? 0),
        totalEarned: Number(ledgerResult.data.total_earned ?? 0),
        totalSpent: Number(ledgerResult.data.total_spent ?? 0),
      }
    : null;

  const { dto, needsRepair } = pickAuthoritativeGemBalance(kai, ledger);
  if (needsRepair) {
    await repairKaiGemBalance(userId, dto);
  }
  return dto;
}

async function repairKaiGemBalance(
  userId: string,
  dto: GemBalanceDTO,
): Promise<void> {
  try {
    const admin = createAdminSupabaseClient();
    const { error } = await admin
      .from("user_kai_state")
      .update({
        gem_balance: dto.balance,
        gem_total_earned: dto.totalEarned,
        gem_total_spent: dto.totalSpent,
      })
      .eq("user_id", userId);
    if (error) {
      logger.warn("[gem-balance.service] kai repair failed", {
        userId,
        error: error.message,
      });
      return;
    }
    void invalidateSessionSliceCaches(userId).catch(() => undefined);
  } catch (error) {
    logger.warn("[gem-balance.service] kai repair failed", {
      userId,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}
