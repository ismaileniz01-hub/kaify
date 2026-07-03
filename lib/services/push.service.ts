import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { isPushConfigured, webpush } from "@/lib/push/vapid";
import { isFcmConfigured, sendFcmMessage } from "@/lib/push/fcm";
import { renderPushCopy } from "@/lib/push/messages";
import { visualFor } from "@/lib/notifications/config";
import type { CreateNotificationInput } from "@/lib/services/notifications.service";

/**
 * Push delivery — Web Push (PWA) + Native (Capacitor / FCM).
 *
 * Web subscriptions live in push_subscriptions; native FCM tokens in
 * native_push_tokens. pushNotification() fans out to both channels.
 */

export type BrowserSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export type NativePlatform = "ios" | "android";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
};

/** Upserts a Web Push subscription (keyed by endpoint). */
export async function saveSubscription(
  userId: string,
  sub: BrowserSubscription,
  userAgent?: string | null,
): Promise<void> {
  const admin = createAdminSupabaseClient();

  const { error } = await admin.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      user_agent: userAgent ?? null,
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    logger.error("push subscription save failed", { error: error.message });
    throw new Error("subscription_save_failed");
  }
}

/** Removes a Web Push subscription. */
export async function deleteSubscription(
  userId: string,
  endpoint: string,
): Promise<void> {
  const admin = createAdminSupabaseClient();

  const { error } = await admin
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId)
    .eq("endpoint", endpoint);

  if (error) {
    logger.warn("push subscription delete failed", { error: error.message });
  }
}

/** Upserts a native FCM token (keyed by token). */
export async function saveNativeToken(
  userId: string,
  platform: NativePlatform,
  token: string,
): Promise<void> {
  const admin = createAdminSupabaseClient();

  const { error } = await admin.from("native_push_tokens").upsert(
    { user_id: userId, platform, token },
    { onConflict: "token" },
  );

  if (error) {
    logger.error("native push token save failed", { error: error.message });
    throw new Error("native_token_save_failed");
  }
}

/** Removes a native FCM token. */
export async function deleteNativeToken(
  userId: string,
  token: string,
): Promise<void> {
  const admin = createAdminSupabaseClient();

  const { error } = await admin
    .from("native_push_tokens")
    .delete()
    .eq("user_id", userId)
    .eq("token", token);

  if (error) {
    logger.warn("native push token delete failed", { error: error.message });
  }
}

async function sendWebPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<number> {
  if (!isPushConfigured()) return 0;

  const admin = createAdminSupabaseClient();
  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error || !subs?.length) return 0;

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/welcome",
    tag: payload.tag,
    icon: payload.icon,
  });

  const expiredEndpoints: string[] = [];
  let delivered = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
        );
        delivered += 1;
      } catch (err) {
        const statusCode =
          typeof err === "object" && err !== null && "statusCode" in err
            ? (err as { statusCode?: number }).statusCode
            : undefined;
        if (statusCode === 404 || statusCode === 410) {
          expiredEndpoints.push(sub.endpoint);
        } else {
          logger.warn("web push send failed", {
            statusCode,
            error: err instanceof Error ? err.message : "unknown",
          });
        }
      }
    }),
  );

  if (expiredEndpoints.length > 0) {
    await admin.from("push_subscriptions").delete().in("endpoint", expiredEndpoints);
  }

  return delivered;
}

async function sendNativePushToUser(
  userId: string,
  payload: PushPayload,
): Promise<number> {
  if (!isFcmConfigured()) return 0;

  const admin = createAdminSupabaseClient();
  const { data: tokens, error } = await admin
    .from("native_push_tokens")
    .select("token")
    .eq("user_id", userId);

  if (error || !tokens?.length) return 0;

  const stale: string[] = [];
  let delivered = 0;

  await Promise.all(
    tokens.map(async (row) => {
      const result = await sendFcmMessage(row.token, payload);
      if (result.ok) delivered += 1;
      else if (result.invalidToken) stale.push(row.token);
    }),
  );

  if (stale.length > 0) {
    await admin.from("native_push_tokens").delete().in("token", stale);
  }

  return delivered;
}

/** Sends to all registered devices (web + native). */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<number> {
  const [web, native] = await Promise.all([
    sendWebPushToUser(userId, payload),
    sendNativePushToUser(userId, payload),
  ]);
  return web + native;
}

export async function getUserLocale(userId: string): Promise<string | null> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("profiles")
    .select("locale")
    .eq("id", userId)
    .maybeSingle();
  return data?.locale ?? null;
}

/** Renders copy and pushes to web + native (best-effort). */
export async function pushNotification(
  input: CreateNotificationInput,
  locale?: string | null,
): Promise<void> {
  const resolvedLocale =
    locale !== undefined ? locale : await getUserLocale(input.userId);

  const copy = await renderPushCopy({
    titleKey: input.titleKey,
    bodyKey: input.bodyKey,
    title: input.title,
    body: input.body,
    params: input.params,
    locale: resolvedLocale,
  });
  if (!copy) return;

  const visual = visualFor(input.type);
  const payload: PushPayload = {
    title: copy.title,
    body: copy.body,
    tag: input.type,
    url: "/welcome",
    icon: visual.avatar,
  };

  if (!isPushConfigured() && !isFcmConfigured()) return;

  await sendPushToUser(input.userId, payload).catch((err) => {
    logger.warn("pushNotification failed", {
      type: input.type,
      error: err instanceof Error ? err.message : "unknown",
    });
  });
}
