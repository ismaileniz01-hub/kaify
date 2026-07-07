import "server-only";
import {
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { logger } from "@/lib/logger";
import { resolveAppUrl } from "@/lib/app-url";

/**
 * Firebase Cloud Messaging (FCM) — native push for Capacitor iOS/Android.
 *
 * Configure with a Firebase service account (FCM HTTP v1). Upload your APNs key
 * in Firebase Console so iOS tokens receive notifications through FCM.
 */

export type NativePushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
};

let app: App | null = null;
let configured: boolean | null = null;

function loadServiceAccount(): ServiceAccount | null {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    try {
      return JSON.parse(json) as ServiceAccount;
    } catch {
      logger.error("fcm invalid FIREBASE_SERVICE_ACCOUNT_JSON");
      return null;
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) return null;

  return { projectId, clientEmail, privateKey };
}

export function isFcmConfigured(): boolean {
  if (configured !== null) return configured;

  const account = loadServiceAccount();
  if (!account) {
    configured = false;
    return false;
  }

  try {
    app = getApps()[0] ?? initializeApp({ credential: cert(account) });
    configured = true;
  } catch (error) {
    logger.error("fcm init failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    configured = false;
  }

  return configured;
}

/** Sends one FCM message. Returns false when token is invalid (caller may prune). */
export async function sendFcmMessage(
  token: string,
  payload: NativePushPayload,
): Promise<{ ok: boolean; invalidToken: boolean }> {
  if (!isFcmConfigured() || !app) {
    return { ok: false, invalidToken: false };
  }

  const appUrl = resolveAppUrl();
  const iconPath = payload.icon ?? "/icons/icon-192.png";
  const iconUrl = iconPath.startsWith("http") ? iconPath : `${appUrl}${iconPath}`;

  try {
    await getMessaging(app).send({
      token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        url: payload.url ?? "/welcome",
        tag: payload.tag ?? "",
        icon: iconUrl,
      },
      android: {
        priority: "high",
        notification: {
          icon: "ic_stat_kaify",
          color: "#a855f7",
          channelId: "kaify_default",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
        fcmOptions: {
          imageUrl: iconUrl,
        },
      },
    });
    return { ok: true, invalidToken: false };
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: string }).code)
        : "";
    const invalid =
      code === "messaging/registration-token-not-registered" ||
      code === "messaging/invalid-registration-token";
    if (!invalid) {
      logger.warn("fcm send failed", {
        code,
        error: error instanceof Error ? error.message : "unknown",
      });
    }
    return { ok: false, invalidToken: invalid };
  }
}
