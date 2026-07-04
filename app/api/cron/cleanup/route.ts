import { NextRequest } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { handleApiError, ok } from "@/lib/api/response";
import { verifyCronSecret } from "@/lib/api/cron-auth";
import { recordCronRun } from "@/lib/services/cron-monitor.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/cron/cleanup — daily maintenance (Vercel Cron). */
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const admin = createAdminSupabaseClient();

    const { data: streakRows } = await admin
      .from("user_streaks")
      .select("user_id")
      .gte("current_streak", 7);

    const userIds = (streakRows ?? []).map((r) => r.user_id);
    let teamChatUnlocked = 0;

    if (userIds.length > 0) {
      const { data: updated } = await admin
        .from("profiles")
        .update({
          team_chat_unlocked: true,
          team_chat_unlocked_at: new Date().toISOString(),
        })
        .in("id", userIds)
        .eq("team_chat_unlocked", false)
        .select("id");
      teamChatUnlocked = updated?.length ?? 0;
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const cutoffDate = cutoff.toISOString().slice(0, 10);

    const { data: deletedSteps } = await admin
      .from("health_steps")
      .delete()
      .lt("entry_date", cutoffDate)
      .select("id");

    const { data: deletedKeys } = await admin
      .from("idempotency_keys")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .select("id");

    const payload = {
      ranAt: new Date().toISOString(),
      results: {
        teamChatUnlocked,
        oldHealthStepsDeleted: deletedSteps?.length ?? 0,
        expiredIdempotencyKeysDeleted: deletedKeys?.length ?? 0,
      },
    };

    await recordCronRun("cleanup", "ok", payload.results);

    return ok(payload);
  } catch (error) {
    await recordCronRun("cleanup", "error", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return handleApiError(error, { route: "/api/cron/cleanup" });
  }
}
