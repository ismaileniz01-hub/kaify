import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api/errors";
import { mapRpcError } from "@/lib/supabase/rpc-errors";

/** Credits freezies via service-role RPC. */
export async function grantFreezie(userId: string, amount: number): Promise<number> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.rpc("grant_freezie", {
    p_user_id: userId,
    p_amount: amount,
  });

  if (error) {
    mapRpcError(error, "[freezie.service:grant]", "Freezie verilemedi.");
  }
  if (data === null || data === undefined) {
    throw new ApiError("INTERNAL_ERROR", "Freezie verilemedi.");
  }

  return Number(data);
}
