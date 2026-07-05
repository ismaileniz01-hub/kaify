import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { createDomainEvent } from "@/lib/events/types";
import { emitDomainEvent } from "@/lib/events/emit";
import { emitCheckInNotifications } from "@/lib/services/notifications.service";
import { invalidateHomeBundleCache } from "@/lib/cache/invalidate";
import { mapCheckInResult, type CheckInDTO } from "@/lib/types/domain.types";

/**
 * Performs the authenticated user's daily check-in.
 *
 * The underlying RPC is fully idempotent per UTC day (a second call the same day
 * is a no-op that returns the current state). Check-in is intentionally NOT
 * gated by usage limits — the streak must never be punished (Streak İstisnası).
 *
 * RPC is service_role-only; the API validates the caller and passes p_user_id.
 *
 * @param requestKey Optional client Idempotency-Key, stored for audit only.
 *                   Daily de-duplication is enforced server-side by date.
 */
export async function performCheckIn(
  userId: string,
  requestKey: string | null,
): Promise<CheckInDTO> {
  const admin = createAdminSupabaseClient();

  const { data, error } = await admin.rpc("perform_daily_check_in", {
    p_request_key: requestKey,
    p_user_id: userId,
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

  void invalidateHomeBundleCache(userId).catch(() => undefined);

  emitDomainEvent(
    createDomainEvent("check_in.completed", userId, {
      streak: dto.currentStreak,
    }, userId),
  );

  // Fire-and-forget: surface Kai level-ups, Freezie awards and milestones.
  // userId is the authenticated caller (RLS already scopes the RPC to them).
  void emitCheckInNotifications(userId, dto).catch((emitError) => {
    logger.warn("check-in notification emit failed", {
      error: emitError instanceof Error ? emitError.message : "unknown",
    });
  });

  return dto;
}
