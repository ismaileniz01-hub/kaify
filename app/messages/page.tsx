"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { MessageRow } from "@/components/messages/MessageRow";
import { type ContactId } from "@/lib/contacts";
import { useKai } from "@/lib/kai-context";
import { useLang } from "@/lib/lang-context";
import { useSession } from "@/lib/session-context";
import { apiGet } from "@/lib/api/client";
import type { InboxCoachDTO } from "@/lib/services/messages.service";
import { CONTACTS, CONTACT_LIST } from "@/lib/contacts";

export default function MessagesPage() {
  const { t } = useLang();
  const { avatar: kaiAvatar } = useKai();
  const { isAuthenticated, profile } = useSession();
  const [inbox, setInbox] = useState<InboxCoachDTO[] | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    apiGet<{ inbox: InboxCoachDTO[] }>("/api/messages")
      .then((res) => setInbox(res.inbox))
      .catch(() => setInbox(null));
  }, [isAuthenticated]);

  const rows =
    inbox ??
    CONTACT_LIST.map((id) => {
      const c = CONTACTS[id];
      return {
        coachId: id,
        name: c.name,
        role: c.role,
        avatarUrl: c.avatar,
        preview: c.preview,
        time: c.time,
        unreadCount: c.badge ?? 0,
      };
    });

  return (
    <div className="phone-shell messages-gradient messages-pattern relative flex flex-col">
      <header className="animate-in animate-in--1 relative flex items-center justify-between px-4 pb-3 pt-16">
        <Link
          href="/welcome"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          aria-label={t("nav.back")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex flex-col items-center">
          <h1 className="text-base font-semibold text-white">{t("nav.messages")}</h1>
          <div className="mt-0.5 h-px w-16 bg-gradient-to-r from-transparent via-purple-400/50 to-transparent" />
        </div>
        <span className="text-[11px] font-medium text-zinc-500">{t("messages.date")}</span>
        <div className="absolute bottom-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-purple-400/30 to-transparent" />
      </header>

      <main className="flex-1 space-y-2.5 overflow-y-auto px-4 pb-8">
        {rows.map((row, i) => {
          const id = row.coachId as ContactId;
          const c = CONTACTS[id];
          return (
            <MessageRow
              key={id}
              index={i}
              name={row.name}
              role={row.role}
              preview={row.preview}
              time={row.time}
              href={`/chat/${id}`}
              avatarSrc={id === "kai" ? kaiAvatar : row.avatarUrl || c.avatar}
              badge={row.unreadCount > 0 ? row.unreadCount : undefined}
              color={c.color.primary}
            />
          );
        })}

        <Link
          href="/chat/team"
          className={`animate-in mt-4 flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition ${
            profile?.teamChatUnlocked || !isAuthenticated
              ? "border-purple-500/20 bg-purple-500/10 hover:bg-purple-500/15"
              : "border-zinc-700/50 bg-zinc-900/50 opacity-60"
          }`}
        >
          <div className="flex -space-x-2">
            {(["alex", "maya", "leo", "kai"] as ContactId[]).map((id) => (
              <div
                key={id}
                className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-zinc-900"
              >
                <Image
                  src={id === "kai" ? kaiAvatar : CONTACTS[id].avatar}
                  alt=""
                  width={32}
                  height={32}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">{t("messages.team_title")}</p>
            <p className="text-[11px] text-zinc-400">
              {profile?.teamChatUnlocked || !isAuthenticated
                ? t("messages.team_sub")
                : "7 günlük seriden sonra açılır"}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-zinc-500" />
        </Link>
      </main>
    </div>
  );
}
