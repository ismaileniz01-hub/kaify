import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { emitCheckInNotifications } from "@/lib/services/notifications.service";
import { mapCheckInResult, type CheckInDTO } from "@/lib/types/domain.types";

/**
 * Performs the authenticated user's daily check-in.
 *
 * The underlying RPC is fully idempotent per UTC day (a second call the same day
 * is a no-op that returns the current state). Check-in is intentionally NOT
 * gated by usage limits — the streak must never be punished (Streak İstisnası).
 *
 * @param requestKey Optional client Idempotency-Key, stored for audit only.
 *                   Daily de-duplication is enforced server-side by date.
 */
export async function performCheckIn(
  userId: string,
  requestKey: string | null,
): Promise<CheckInDTO> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("perform_daily_check_in", {
    p_request_key: requestKey,
  });

  if (error) {
    if (error.code === "P0001") {
      throw new ApiError("CONFLICT", error.message);
    }
    logger.error("[streak.service:checkIn] rpc error", { error: error.message });
    throw new ApiError("INTERNAL_ERROR", "Check-in işlemi tamamlanamadı.");
  }
  if (!data) {
    throw new ApiError("INTERNAL_ERROR", "Check-in işlemi tamamlanamadı.");
  }

  const dto = mapCheckInResult(data);

  // Fire-and-forget: surface Kai level-ups, Freezie awards and milestones.
  // userId is the authenticated caller (RLS already scopes the RPC to them).
  void emitCheckInNotifications(userId, dto).catch((emitError) => {
    logger.warn("check-in notification emit failed", {
      error: emitError instanceof Error ? emitError.message : "unknown",
    });
  });

  return dto;
}
