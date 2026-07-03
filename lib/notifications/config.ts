import type { NotificationType } from "@/lib/types/database.types";

/**
 * Per-type visual identity for notifications, shared by the in-app center and
 * the Web Push payload so the phone notification matches the app.
 *
 * `avatar` is a coach/Kai portrait (root-relative — works for <img> and the push
 * `icon`). `color` is the accent used for badges/rings. Kept as plain data so it
 * is safe to import from both server (push.service) and client (UI) code.
 */

export type NotificationVisual = {
  /** Coach/Kai portrait shown as the notification's main image. */
  avatar: string;
  /** Accent color (hex) for the type badge and card ring. */
  color: string;
  /** Which teammate "sends" this notification (for the display name). */
  from: "Kai" | "Alex" | "Dr. Maya" | "Leo";
};

const KAI = "/kai-mascot-v2.png";
const ALEX = "/avatars/alex.png";
const MAYA = "/avatars/maya-notif.png";
const LEO = "/avatars/leo.png";

export const NOTIFICATION_VISUAL: Record<NotificationType, NotificationVisual> = {
  streak_risk: { avatar: KAI, color: "#f59e0b", from: "Kai" },
  streak_milestone: { avatar: KAI, color: "#eab308", from: "Kai" },
  kai_level_up: { avatar: KAI, color: "#a855f7", from: "Kai" },
  freezie_earned: { avatar: KAI, color: "#38bdf8", from: "Kai" },
  badge: { avatar: KAI, color: "#eab308", from: "Kai" },
  weekly_summary: { avatar: ALEX, color: "#3b82f6", from: "Alex" },
  water_reminder: { avatar: MAYA, color: "#06b6d4", from: "Dr. Maya" },
  praise: { avatar: KAI, color: "#a855f7", from: "Kai" },
  system: { avatar: KAI, color: "#a1a1aa", from: "Kai" },
};

export function visualFor(type: NotificationType): NotificationVisual {
  return NOTIFICATION_VISUAL[type] ?? NOTIFICATION_VISUAL.system;
}
