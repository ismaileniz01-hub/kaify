import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export type KaiStateDTO = {
  unlockedLevel: number;
  activeAura: string;
  ownedEffectIds: string[];
};

export async function getKaiState(userId: string): Promise<KaiStateDTO> {
  const supabase = await createServerSupabaseClient();

  const [
    { data: kai, error: kaiError },
    { data: owned, error: ownedError },
  ] = await Promise.all([
    supabase
      .from("user_kai_state")
      .select("unlocked_level, active_aura")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("user_market_inventory")
      .select("item_id")
      .eq("user_id", userId),
  ]);

  if (kaiError) logger.error("[kai-state.service] kai read error", { error: kaiError.message });
  if (ownedError) logger.error("[kai-state.service] inventory read error", { error: ownedError.message });

  return {
    unlockedLevel: kai?.unlocked_level ?? 1,
    activeAura: kai?.active_aura ?? "default",
    ownedEffectIds: (owned ?? []).map((r) => r.item_id),
  };
}
