"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { MessageRow } from "@/components/messages/MessageRow";
import { CONTACT_LIST, CONTACTS, type ContactId } from "@/lib/contacts";
import { useKai } from "@/lib/kai-context";
import { useLang } from "@/lib/lang-context";

export default function MessagesPage() {
  const { t } = useLang();
  const { avatar: kaiAvatar } = useKai();
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
        {/* İnce çizgi — header altı */}
        <div className="absolute bottom-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-purple-400/30 to-transparent" />
      </header>

      <main className="flex-1 space-y-2.5 overflow-y-auto px-4 pb-8">
        {CONTACT_LIST.map((id, i) => {
          const c = CONTACTS[id];
          return (
            <MessageRow
              key={id}
              index={i}
              name={c.name}
              role={c.role}
              preview={c.preview}
              time={c.time}
              href={`/chat/${id}`}
              avatarSrc={id === "kai" ? kaiAvatar : c.avatar}
              badge={c.badge}
              color={c.color.primary}
            />
          );
        })}

        {/* All coaches — dikdörtgen buton, en altta */}
        <div className="animate-in animate-in--8 pt-4">
          <Link
            href="/chat/team"
            className="group flex w-full items-center justify-center gap-6 rounded-2xl border-2 border-purple-500/70 bg-[#1a0a2e] px-9 py-7 shadow-lg shadow-purple-500/20 transition hover:border-purple-400 hover:shadow-purple-500/40 active:scale-[0.98]"
            style={{
              boxShadow: "0 0 12px rgba(168, 85, 247, 0.25), inset 0 0 8px rgba(168, 85, 247, 0.08)",
              animation: "color-shift 4s ease-in-out infinite",
            }}
          >
            <div className="flex shrink-0 -space-x-3">
              {CONTACT_LIST.map((id) => (
                <div
                  key={id}
                  className="relative h-14 w-14 overflow-hidden rounded-full border-2 border-purple-500/40 bg-zinc-900 shadow-md"
                >
                  <Image
                    src={id === "kai" ? kaiAvatar : CONTACTS[id].avatar}
                    alt={CONTACTS[id].name}
                    width={56}
                    height={56}
                    className="h-full w-full object-contain p-0.5"
                  />
                </div>
              ))}
            </div>
            <div className="text-left">
              <p className="text-xl font-semibold text-white">{t("messages.all_coaches")}</p>
              <p className="text-base text-purple-300">{t("messages.team_chat")}</p>
            </div>
            <ChevronRight className="ml-auto h-6 w-6 shrink-0 text-purple-400/80 transition group-hover:text-purple-300" />
          </Link>
        </div>
      </main>
    </div>
  );
}
