import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/errors";
import { mapRpcError } from "@/lib/supabase/rpc-errors";
import { logger } from "@/lib/logger";
import { cached } from "@/lib/cache";

export type MarketItemDTO = {
  id: string;
  nameKey: string;
  price: number;
  colorHex: string;
  owned: boolean;
};

export type MarketStateDTO = {
  items: MarketItemDTO[];
  activeAura: string;
  ownedIds: string[];
};

type MarketItemRow = {
  id: string;
  name_key: string;
  price: number;
  color_hex: string;
  sort_order: number;
};

export async function getMarketState(userId: string): Promise<MarketStateDTO> {
  const supabase = await createServerSupabaseClient();

  // The catalog is the same for everyone and changes rarely → cache it.
  // The user's owned items and active aura are per-user → always live.
  const [items, { data: owned, error: ownedError }, { data: kai, error: kaiError }] =
    await Promise.all([
      cached<MarketItemRow[]>("market:items:v2", 300, async () => {
        const { data, error } = await supabase
          .from("market_items")
          .select("id, name_key, price, color_hex, sort_order")
          .order("sort_order");
        if (error) {
          logger.error("[market.service] items read error", { error: error.message });
          throw new ApiError("INTERNAL_ERROR", "Market yüklenemedi.");
        }
        return data ?? [];
      }),
      supabase.from("user_market_inventory").select("item_id").eq("user_id", userId),
      supabase
        .from("user_kai_state")
        .select("active_aura")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

  if (ownedError) {
    logger.error("[market.service] inventory read error", { error: ownedError.message });
    throw new ApiError("INTERNAL_ERROR", "Market envanteri yüklenemedi.");
  }
  if (kaiError) {
    logger.error("[market.service] kai read error", { error: kaiError.message });
    throw new ApiError("INTERNAL_ERROR", "Kai durumu yüklenemedi.");
  }

  const ownedSet = new Set((owned ?? []).map((r) => r.item_id));

  return {
    items: (items ?? []).map((item) => ({
      id: item.id,
      nameKey: item.name_key,
      price: item.price,
      colorHex: item.color_hex,
      owned: ownedSet.has(item.id),
    })),
    activeAura: kai?.active_aura ?? "default",
    ownedIds: [...ownedSet],
  };
}

export async function purchaseMarketItem(
  userId: string,
  itemId: string,
): Promise<{ balance: number; itemId: string; activeAura: string }> {
  const admin = createAdminSupabaseClient();
  const idempotencyKey = `market:${userId}:${itemId}`;

  const { data, error } = await admin.rpc("purchase_market_item", {
    p_user_id: userId,
    p_item_id: itemId,
    p_idempotency_key: idempotencyKey,
  });

  if (error) {
    mapRpcError(error, "[market.service] purchase", "Satın alma işlemi başarısız.");
  }

  if (!data || typeof data !== "object") {
    throw new ApiError("INTERNAL_ERROR", "Satın alma işlemi başarısız.");
  }

  const result = data as { balance?: number; item_id?: string; active_aura?: string };

  return {
    balance: result.balance ?? 0,
    itemId: result.item_id ?? itemId,
    activeAura: result.active_aura ?? itemId,
  };
}

export async function applyMarketAura(
  userId: string,
  itemId: string,
): Promise<{ activeAura: string }> {
  const admin = createAdminSupabaseClient();

  const { data: owned } = await admin
    .from("user_market_inventory")
    .select("item_id")
    .eq("user_id", userId)
    .eq("item_id", itemId)
    .maybeSingle();

  if (!owned && itemId !== "default") {
    throw new ApiError("FORBIDDEN", "Bu efekte sahip değilsiniz.");
  }

  const { data, error } = await admin.rpc("set_active_aura", {
    p_user_id: userId,
    p_item_id: itemId,
  });

  if (error) {
    mapRpcError(error, "[market.service] set_active_aura", "Aura uygulanamadı.");
  }

  const activeAura =
    data && typeof data === "object" && "active_aura" in data
      ? String((data as { active_aura: string }).active_aura)
      : itemId;

  return { activeAura };
}
