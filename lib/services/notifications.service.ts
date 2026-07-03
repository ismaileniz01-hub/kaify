import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { pushNotification } from "@/lib/services/push.service";
import type { Json, NotificationType } from "@/lib/types/database.types";
import type { CheckInDTO } from "@/lib/types/domain.types";

/** Streak lengths that earn a celebratory milestone notification. */
export const STREAK_MILESTONES = [7, 30, 60, 100, 180, 365] as const;

/**
 * In-app notifications.
 *
 * Reads run through the user-scoped client (RLS enforces ownership). Writes use
 * the service-role client (only the server decides what to notify). Content is
 * i18n-friendly: prefer `titleKey`/`bodyKey` + `params` so the client renders in
 * the user's language; `title`/`body` free text is only for AI-generated copy.
 */

export type NotificationDTO = {
  id: string;
  type: NotificationType;
  title: string | null;
  body: string | null;
  titleKey: string | null;
  bodyKey: string | null;
  params: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
};

export type NotificationListDTO = {
  items: NotificationDTO[];
  unreadCount: number;
};

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title?: string | null;
  body?: string | null;
  titleKey?: string | null;
  bodyKey?: string | null;
  params?: Record<string, unknown> | null;
  /** Prevents duplicate creation (e.g. one streak-risk per user per day). */
  dedupKey?: string | null;
};

const MAX_LIST = 50;

function mapRow(row: {
  id: string;
  type: NotificationType;
  title: string | null;
  body: string | null;
  title_key: string | null;
  body_key: string | null;
  params: Json | null;
  read: boolean;
  created_at: string;
}): NotificationDTO {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    titleKey: row.title_key,
    bodyKey: row.body_key,
    params: (row.params as Record<string, unknown> | null) ?? null,
    read: row.read,
    createdAt: row.created_at,
  };
}

/** Lists the caller's most recent notifications plus the unread count. */
export async function listNotifications(): Promise<NotificationListDTO> {
  const supabase = await createServerSupabaseClient();

  const [{ data, error }, { count, error: countError }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, type, title, body, title_key, body_key, params, read, created_at")
      .order("created_at", { ascending: false })
      .limit(MAX_LIST),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("read", false),
  ]);

  if (error || countError) {
    logger.error("notifications list failed", {
      error: (error ?? countError)?.message,
    });
    throw new ApiError("INTERNAL_ERROR", "Bildirimler alınamadı.");
  }

  return {
    items: (data ?? []).map(mapRow),
    unreadCount: count ?? 0,
  };
}

/** Marks the caller's notifications read (all when `ids` is omitted). */
export async function markNotificationsRead(ids?: string[]): Promise<number> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("mark_notifications_read", {
    p_ids: ids && ids.length > 0 ? ids : null,
  });

  if (error) {
    logger.error("notifications mark-read failed", { error: error.message });
    throw new ApiError("INTERNAL_ERROR", "Bildirimler güncellenemedi.");
  }

  return data ?? 0;
}

/**
 * Creates one notification (service-role). Idempotent when `dedupKey` is set:
 * a duplicate (user_id, dedup_key) is silently ignored.
 */
export async function createNotification(
  input: CreateNotificationInput,
): Promise<void> {
  const admin = createAdminSupabaseClient();

  const { error } = await admin.from("notifications").insert({
    user_id: input.userId,
    type: input.type,
    title: input.title ?? null,
    body: input.body ?? null,
    title_key: input.titleKey ?? null,
    body_key: input.bodyKey ?? null,
    params: (input.params ?? null) as Json | null,
    dedup_key: input.dedupKey ?? null,
  });

  // 23505 = dedup hit -> expected no-op (already notified, don't push again).
  if (error) {
    if (error.code !== "23505") {
      logger.warn("notification create failed", {
        type: input.type,
        error: error.message,
      });
    }
    return;
  }

  // Newly created -> mirror to Web Push (best-effort, never blocks).
  void pushNotification(input).catch((err) => {
    logger.warn("push mirror failed", {
      type: input.type,
      error: err instanceof Error ? err.message : "unknown",
    });
  });
}

/** Bulk create for cron jobs. Uses dedup keys to stay idempotent per run. */
export async function createNotificationsBatch(
  inputs: CreateNotificationInput[],
): Promise<number> {
  if (inputs.length === 0) return 0;
  const admin = createAdminSupabaseClient();

  const rows = inputs.map((input) => ({
    user_id: input.userId,
    type: input.type,
    title: input.title ?? null,
    body: input.body ?? null,
    title_key: input.titleKey ?? null,
    body_key: input.bodyKey ?? null,
    params: (input.params ?? null) as Json | null,
    dedup_key: input.dedupKey ?? null,
  }));

  const { data, error } = await admin
    .from("notifications")
    .upsert(rows, { onConflict: "user_id,dedup_key", ignoreDuplicates: true })
    .select("id, user_id, type, title, body, title_key, body_key, params");

  if (error) {
    logger.warn("notifications batch create failed", { error: error.message });
    return 0;
  }

  const inserted = data ?? [];
  if (inserted.length > 0) {
    // Push only the rows that were actually inserted (dedup skips are excluded).
    const userIds = [...new Set(inserted.map((r) => r.user_id))];
    const { data: profs } = await admin
      .from("profiles")
      .select("id, locale")
      .in("id", userIds);
    const localeById = new Map((profs ?? []).map((p) => [p.id, p.locale]));

    await Promise.all(
      inserted.map((r) =>
        pushNotification(
          {
            userId: r.user_id,
            type: r.type,
            title: r.title,
            body: r.body,
            titleKey: r.title_key,
            bodyKey: r.body_key,
            params: (r.params as Record<string, unknown> | null) ?? null,
          },
          localeById.get(r.user_id) ?? null,
        ).catch(() => {}),
      ),
    );
  }

  return inserted.length;
}

/**
 * Emits event notifications triggered by a successful daily check-in:
 * Kai level up, Freezie earned, and streak milestones. Idempotent via dedup
 * keys, so replays never duplicate. Best-effort — never blocks the check-in.
 */
export async function emitCheckInNotifications(
  userId: string,
  dto: CheckInDTO,
): Promise<void> {
  if (dto.alreadyCheckedIn) return;

  const jobs: CreateNotificationInput[] = [];

  if (dto.kaiLevelUp) {
    jobs.push({
      userId,
      type: "kai_level_up",
      titleKey: "notif.kai_level_up.title",
      bodyKey: "notif.kai_level_up.body",
      params: { level: dto.kaiUnlockedLevel },
      dedupKey: `kai_level_up:${dto.kaiUnlockedLevel}`,
    });
  }

  if (dto.freezieAwarded) {
    jobs.push({
      userId,
      type: "freezie_earned",
      titleKey: "notif.freezie_earned.title",
      bodyKey: "notif.freezie_earned.body",
      params: { balance: dto.freezieBalance },
      dedupKey: `freezie:${dto.checkedInDate}`,
    });
  }

  if ((STREAK_MILESTONES as readonly number[]).includes(dto.currentStreak)) {
    jobs.push({
      userId,
      type: "streak_milestone",
      titleKey: "notif.streak_milestone.title",
      bodyKey: "notif.streak_milestone.body",
      params: { days: dto.currentStreak },
      dedupKey: `milestone:${dto.currentStreak}`,
    });
  }

  await Promise.all(jobs.map((job) => createNotification(job)));
}
