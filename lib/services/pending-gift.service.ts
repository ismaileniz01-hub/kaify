import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/errors";
import { mapRpcError } from "@/lib/supabase/rpc-errors";
import { logger } from "@/lib/logger";
import { createNotification } from "@/lib/services/notifications.service";

export type PendingGiftKind = "gems" | "freezie";

export type PendingGiftDTO = {
  id: string;
  rewardKind: PendingGiftKind;
  amount: number;
  reason: string;
  createdAt: string;
};

export type ClaimPendingGiftResult = {
  giftId: string;
  rewardKind: PendingGiftKind;
  amount: number;
  gemBalance: number;
  freezieBalance: number | null;
};

export async function createPendingGift(input: {
  userId: string;
  rewardKind: PendingGiftKind;
  amount: number;
  reason: string;
  grantedBy: string;
}): Promise<PendingGiftDTO> {
  const admin = createAdminSupabaseClient();

  const { data, error } = await admin.rpc("admin_create_pending_gift", {
    p_user_id: input.userId,
    p_reward_kind: input.rewardKind,
    p_amount: input.amount,
    p_reason: input.reason,
    p_granted_by: input.grantedBy,
  });

  if (error) {
    logger.error("[pending-gift] create rpc failed", { error: error.message });
    mapRpcError(error, "[pending-gift:create]", "Hediye oluşturulamadı.");
  }
  if (!data || typeof data !== "object") {
    throw new ApiError("INTERNAL_ERROR", "Hediye oluşturulamadı.");
  }

  const row = data as Record<string, unknown>;
  const gift: PendingGiftDTO = {
    id: String(row.id),
    rewardKind: row.rewardKind as PendingGiftKind,
    amount: Number(row.amount),
    reason: String(row.reason ?? ""),
    createdAt: String(row.createdAt),
  };

  void createNotification({
    userId: input.userId,
    type: "system",
    titleKey: "gift.pending.title",
    bodyKey: "gift.pending.body",
    params: {
      amount: input.amount,
      kind: input.rewardKind,
      reason: input.reason,
    },
    dedupKey: `pending_gift:${gift.id}`,
  }).catch(() => {});

  return gift;
}

export async function listPendingGiftsForUser(): Promise<PendingGiftDTO[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("pending_gifts")
    .select("id, reward_kind, amount, reason, created_at")
    .is("claimed_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    logger.error("[pending-gift] list failed", { error: error.message });
    throw new ApiError("INTERNAL_ERROR", "Hediyeler alınamadı.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    rewardKind: row.reward_kind as PendingGiftKind,
    amount: row.amount,
    reason: row.reason,
    createdAt: row.created_at,
  }));
}

export async function claimPendingGift(giftId: string): Promise<ClaimPendingGiftResult> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("claim_pending_gift", {
    p_gift_id: giftId,
  });

  if (error) {
    mapRpcError(error, "[pending-gift:claim]", "Hediye alınamadı.");
  }
  if (!data || typeof data !== "object") {
    throw new ApiError("INTERNAL_ERROR", "Hediye alınamadı.");
  }

  const payload = data as Record<string, unknown>;
  return {
    giftId: String(payload.giftId),
    rewardKind: payload.rewardKind as PendingGiftKind,
    amount: Number(payload.amount),
    gemBalance: Number(payload.gemBalance ?? 0),
    freezieBalance:
      payload.freezieBalance === null || payload.freezieBalance === undefined
        ? null
        : Number(payload.freezieBalance),
  };
}
