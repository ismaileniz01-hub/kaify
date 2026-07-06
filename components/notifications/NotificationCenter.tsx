"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  Award,
  BarChart3,
  Bell,
  BellRing,
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
import { InlineAlert } from "@/components/InlineAlert";
import { visualFor } from "@/lib/notifications/config";
import type { NotificationDTO } from "@/lib/services/notifications.service";
import type { NotificationType } from "@/lib/types/database.types";

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

function relativeTime(iso: string, locale: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return new Date(iso).toLocaleDateString(locale, { month: "short", day: "numeric" });
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
  const { t, lang } = useLang();
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
      className={`animate-in animate-in--${Math.min(index + 1, 8)} group flex w-full items-start gap-3 rounded-2xl border px-3.5 py-3.5 text-left transition active:scale-[0.99] ${
        item.read
          ? "border-white/5 bg-white/[0.03] hover:bg-white/[0.05]"
          : "border-white/10 bg-white/[0.06] hover:bg-white/[0.08]"
      }`}
      style={
        item.read
          ? undefined
          : { boxShadow: `0 0 24px ${hexToRgba(color, 0.12)}` }
      }
    >
      <div className="relative h-12 w-12 shrink-0">
        <span
          className="absolute inset-0 rounded-full p-[2px]"
          style={{
            background: `linear-gradient(135deg, ${hexToRgba(color, 0.9)}, ${hexToRgba(color, 0.35)})`,
            boxShadow: item.read ? "none" : `0 0 14px ${hexToRgba(color, 0.35)}`,
          }}
        >
          <Image
            src={visual.avatar}
            alt={visual.from}
            width={48}
            height={48}
            className="h-full w-full rounded-full object-cover"
            style={{ background: "#0a0a0a" }}
          />
        </span>
        <span
          className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-[#0c0614]"
          style={{ background: color }}
        >
          <Icon className="h-3 w-3 text-white" strokeWidth={2.5} />
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-snug text-white">{title}</p>
          <span className="shrink-0 text-[10px] text-zinc-500">
            {relativeTime(item.createdAt, lang)}
          </span>
        </div>
        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide" style={{ color: hexToRgba(color, 0.9) }}>
          {visual.from}
        </p>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-400">{body}</p>
      </div>

      {!item.read && (
        <span
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
          style={{ background: color }}
        />
      )}
    </button>
  );
}

function NotificationPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useLang();
  const { notifications, unreadCount, loading, markAllRead, markRead, refresh } =
    useNotifications();
  const [markAllSuccess, setMarkAllSuccess] = useState(false);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleMarkAllRead = async () => {
    await markAllRead();
    setMarkAllSuccess(true);
    setTimeout(() => setMarkAllSuccess(false), 2500);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex justify-center"
      role="presentation"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-[#030208]/90 backdrop-blur-xl" />

      <div
        className="notif-panel relative flex h-[100dvh] w-full max-w-[420px] flex-col overflow-hidden shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notif-panel-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative shrink-0 overflow-hidden border-b border-white/10 px-4 pb-4 pt-14">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-600/30 via-violet-900/20 to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-purple-500/20 blur-3xl"
          />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/25 ring-1 ring-purple-400/30">
                  <BellRing className="h-4 w-4 text-purple-200" strokeWidth={2} />
                </span>
                <h2 id="notif-panel-title" className="text-xl font-bold text-white">
                  {t("notif.title")}
                </h2>
              </div>
              <p className="mt-1.5 text-xs text-purple-100/70">{t("notif.panel.subtitle")}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("nav.back")}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-zinc-300 ring-1 ring-white/15 transition hover:bg-white/15 active:scale-95"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          <div className="relative mt-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 rounded-full bg-black/30 px-3 py-1.5 ring-1 ring-white/10">
              <span className="text-[11px] text-zinc-400">{t("notif.panel.total")}</span>
              <span className="text-sm font-semibold text-white">{notifications.length}</span>
              {unreadCount > 0 && (
                <>
                  <span className="text-zinc-600">·</span>
                  <span className="text-[11px] text-purple-300">
                    {t("notif.panel.unread", { count: unreadCount })}
                  </span>
                </>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                className="flex items-center gap-1.5 rounded-full bg-purple-500/20 px-3 py-1.5 text-[11px] font-semibold text-purple-200 ring-1 ring-purple-400/30 transition hover:bg-purple-500/30 active:scale-95"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                {t("notif.mark_all_read")}
              </button>
            )}
          </div>
        </div>

        {markAllSuccess && (
          <div className="shrink-0 px-4 pt-3">
            <InlineAlert variant="success" message={t("notif.mark_all_success")} />
          </div>
        )}

        <div className="shrink-0 border-b border-white/5 bg-[#0a0612]/80">
          <PushToggle />
        </div>

        {/* List */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {loading && notifications.length === 0 ? (
            <div className="space-y-3 py-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/5" aria-hidden />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-500/20 to-violet-900/10 ring-1 ring-purple-400/20">
                <Bell className="h-9 w-9 text-purple-300/60" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-base font-semibold text-zinc-300">{t("notif.empty.title")}</p>
                <p className="mx-auto mt-2 max-w-[260px] text-sm leading-relaxed text-zinc-500">
                  {t("notif.empty.subtitle")}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 pb-6">
              {notifications.map((item, index) => (
                <NotificationCard
                  key={item.id}
                  item={item}
                  index={index}
                  onClick={() => void markRead(item.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Bell button + full-screen notification panel (portaled to body). */
export function NotificationCenter() {
  const { t } = useLang();
  const { unreadCount } = useNotifications();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

      {mounted &&
        open &&
        createPortal(
          <NotificationPanel open={open} onClose={() => setOpen(false)} />,
          document.body,
        )}
    </>
  );
}
