"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Award,
  BarChart3,
  Bell,
  CheckCheck,
  Droplet,
  Flame,
  Snowflake,
  Sparkles,
  Star,
  Trophy,
  X,
  type LucideIcon,
} from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { useNotifications } from "@/lib/notification-context";
import { PushToggle } from "@/components/notifications/PushToggle";
import { visualFor } from "@/lib/notifications/config";
import type { NotificationDTO } from "@/lib/services/notifications.service";
import type { NotificationType } from "@/lib/types/database.types";

/** Per-type badge icon (color + avatar come from the shared visual config). */
const TYPE_ICON: Record<NotificationType, LucideIcon> = {
  streak_risk: Flame,
  streak_milestone: Trophy,
  kai_level_up: Sparkles,
  freezie_earned: Snowflake,
  badge: Award,
  weekly_summary: BarChart3,
  water_reminder: Droplet,
  praise: Star,
  system: Bell,
};

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return `${Math.floor(day / 7)}w`;
}

function NotificationCard({
  item,
  index,
  onClick,
}: {
  item: NotificationDTO;
  index: number;
  onClick: () => void;
}) {
  const { t } = useLang();
  const visual = visualFor(item.type);
  const Icon = TYPE_ICON[item.type] ?? Bell;
  const color = visual.color;
  const params = (item.params ?? {}) as Record<string, string | number>;

  const title = item.title ?? (item.titleKey ? t(item.titleKey, params) : "");
  const body = item.body ?? (item.bodyKey ? t(item.bodyKey, params) : "");

  return (
    <button
      type="button"
      onClick={onClick}
      className={`animate-in animate-in--${Math.min(index + 1, 8)} group flex w-full items-start gap-3 rounded-xl border-2 px-3.5 py-3 text-left transition hover:brightness-110 active:scale-[0.99]`}
      style={{
        borderColor: hexToRgba(color, item.read ? 0.25 : 0.6),
        background: item.read
          ? "rgba(255,255,255,0.02)"
          : hexToRgba(color, 0.08),
        boxShadow: item.read ? "none" : `0 0 10px ${hexToRgba(color, 0.15)}`,
      }}
    >
      {/* Avatar with a small type badge — mirrors the phone push look */}
      <div className="relative h-11 w-11 shrink-0">
        <span
          className="absolute inset-0 rounded-full"
          style={{
            padding: 2,
            background: hexToRgba(color, 0.5),
            boxShadow: item.read ? "none" : `0 0 10px ${hexToRgba(color, 0.35)}`,
          }}
        >
          <Image
            src={visual.avatar}
            alt={visual.from}
            width={44}
            height={44}
            className="h-full w-full rounded-full object-cover"
            style={{ background: "#0a0a0a" }}
          />
        </span>
        <span
          className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-[#0a0a0a]"
          style={{ background: color }}
        >
          <Icon className="h-3 w-3 text-white" strokeWidth={2.5} />
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-white">{title}</p>
          {!item.read && (
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: color }}
            />
          )}
        </div>
        <p className="mt-0.5 text-[10px] font-medium" style={{ color: hexToRgba(color, 0.85) }}>
          {visual.from}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs text-zinc-400">{body}</p>
      </div>

      <span className="shrink-0 text-[10px] text-zinc-500">
        {relativeTime(item.createdAt)}
      </span>
    </button>
  );
}

/** Bell button + slide-in notification panel. Mount inside the phone-shell header. */
export function NotificationCenter() {
  const { t } = useLang();
  const { notifications, unreadCount, loading, markAllRead, markRead, refresh } =
    useNotifications();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("notif.title")}
        className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-zinc-400 ring-2 ring-white/15 transition hover:brightness-110 active:scale-95"
      >
        <Bell className="h-4 w-4" strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-purple-500 px-1 text-[9px] font-bold text-white ring-2 ring-[#0a0a0a]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex justify-center"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Side branding — fills the empty gutters on wide screens */}
          <span
            aria-hidden
            className="pointer-events-none absolute left-0 top-1/2 hidden -translate-y-1/2 select-none text-[110px] font-extrabold tracking-[0.3em] text-white/[0.04] [writing-mode:vertical-rl] lg:block"
          >
            KAIFY
          </span>
          <span
            aria-hidden
            className="pointer-events-none absolute right-0 top-1/2 hidden -translate-y-1/2 rotate-180 select-none text-[110px] font-extrabold tracking-[0.3em] text-white/[0.04] [writing-mode:vertical-rl] lg:block"
          >
            KAIFY
          </span>

          <div
            className="animate-in animate-in--1 relative mt-0 flex h-full w-full max-w-[420px] flex-col bg-[#0a0a0a] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 px-4 pb-3 pt-14">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-purple-300" strokeWidth={2} />
                <h2 className="text-lg font-semibold text-white">
                  {t("notif.title")}
                </h2>
                {unreadCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-purple-500/80 px-1.5 text-[10px] font-semibold text-white">
                    {unreadCount}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("nav.back")}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-zinc-400 ring-2 ring-white/15 transition hover:brightness-110 active:scale-95"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            {/* Phone push opt-in */}
            <PushToggle />

            {/* Actions */}
            {unreadCount > 0 && (
              <div className="flex justify-end px-4 py-2">
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  className="flex items-center gap-1.5 rounded-full bg-purple-500/15 px-3 py-1.5 text-[11px] font-semibold text-purple-300 ring-1 ring-purple-400/30 transition hover:brightness-110 active:scale-95"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  {t("notif.mark_all_read")}
                </button>
              </div>
            )}

            {/* List */}
            <div className="flex-1 space-y-2.5 overflow-y-auto px-4 pb-8 pt-1">
              {notifications.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 py-20 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
                    <Bell className="h-7 w-7 text-zinc-600" strokeWidth={1.5} />
                  </div>
                  <p className="text-sm font-medium text-zinc-400">
                    {t("notif.empty.title")}
                  </p>
                  <p className="max-w-[240px] text-xs text-zinc-600">
                    {t("notif.empty.subtitle")}
                  </p>
                </div>
              ) : (
                notifications.map((item, index) => (
                  <NotificationCard
                    key={item.id}
                    item={item}
                    index={index}
                    onClick={() => void markRead(item.id)}
                  />
                ))
              )}

              {loading && notifications.length === 0 && (
                <p className="py-10 text-center text-xs text-zinc-600">…</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
