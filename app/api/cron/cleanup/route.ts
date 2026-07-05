import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { defineCronRoute } from "@/lib/api/route-handler";
import { recordCronRun } from "@/lib/services/cron-monitor.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/cron/cleanup — daily maintenance (Vercel Cron). */
export const GET = defineCronRoute("/api/cron/cleanup", async () => {
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

    const { data: deletedKeys } = await admin
      .from("idempotency_keys")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .select("id");

    const stuckCutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recoveredStuck } = await admin
      .from("idempotency_keys")
      .delete()
      .eq("status", "in_progress")
      .lt("created_at", stuckCutoff)
      .select("id");

    const payload = {
      ranAt: new Date().toISOString(),
      results: {
        teamChatUnlocked,
        expiredIdempotencyKeysDeleted: deletedKeys?.length ?? 0,
        stuckIdempotencyKeysRecovered: recoveredStuck?.length ?? 0,
      },
    };

    await recordCronRun("cleanup", "ok", payload.results);

    return payload;
  } catch (error) {
    await recordCronRun("cleanup", "error", {
      message: error instanceof Error ? error.message : "unknown",
    });
    throw error;
  }
});
