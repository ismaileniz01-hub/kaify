import "server-only";
import webpush from "web-push";
import { logger } from "@/lib/logger";

/**
 * Web Push (VAPID) configuration.
 *
 * Keys are generated with `npx web-push generate-vapid-keys`. The public key is
 * also exposed to the browser via NEXT_PUBLIC_VAPID_PUBLIC_KEY; the private key
 * stays server-only. Push is a best-effort feature: if VAPID is not configured,
 * the app still works with in-app notifications only.
 */

let configured: boolean | null = null;

export function isPushConfigured(): boolean {
  if (configured !== null) return configured;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:support@kaify.org";

  if (!publicKey || !privateKey) {
    configured = false;
    return false;
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  } catch (error) {
    logger.error("vapid configuration failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    configured = false;
  }

  return configured;
}

export { webpush };
