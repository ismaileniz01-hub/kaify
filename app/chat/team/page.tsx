"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Send, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CONTACTS, type ContactId } from "@/lib/contacts";
import { useKai } from "@/lib/kai-context";
import { useLang } from "@/lib/lang-context";
import { useSession } from "@/lib/session-context";
import { apiGet, apiPost } from "@/lib/api/client";
import { errorToMessage } from "@/lib/i18n/api-error";
import type { ChatMessageDTO } from "@/lib/types/domain.types";

type TeamMessage = {
  id: string;
  coachId: ContactId;
  text: string;
  time: string;
};

export default function TeamChatPage() {
  const { t } = useLang();
  const { avatar: kaiAvatar } = useKai();
  const { isAuthenticated, profile } = useSession();
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const unlocked = !isAuthenticated || profile?.teamChatUnlocked;

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    apiGet<{ messages: ChatMessageDTO[] }>("/api/chat/team")
      .then((res) => {
        setMessages(
          res.messages.map((m) => ({
            id: m.id,
            coachId: (m.coachId ?? "kai") as ContactId,
            text: m.content ?? "",
            time: new Date(m.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          })),
        );
      })
      .catch(() => setError(t("team.error.load")))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startMeeting = async () => {
    if (!isAuthenticated || !unlocked || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await apiPost<{ messages: ChatMessageDTO[] }>("/api/chat/team");
      setMessages((prev) => [
        ...prev,
        ...res.messages.map((m) => ({
          id: m.id,
          coachId: (m.coachId ?? "kai") as ContactId,
          text: m.content ?? "",
          time: new Date(m.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        })),
      ]);
    } catch (e) {
      setError(errorToMessage(e, t));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="phone-shell messages-gradient relative flex min-h-0 flex-col">
      <header className="flex items-center gap-3 px-4 pb-2 pt-12">
        <Link
          href="/messages"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-zinc-400"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex flex-1 flex-col items-center">
          <h1 className="text-sm font-semibold text-white">{t("messages.team_title")}</h1>
          <p className="text-[10px] text-zinc-500">{t("messages.team_sub")}</p>
        </div>
        <Users className="h-5 w-5 text-purple-400" />
      </header>

      {!unlocked && (
        <div className="mx-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-xs text-amber-200">
          Takım sohbeti 7 günlük seriden sonra açılır.
        </div>
      )}

      <main className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {loading && <p className="text-center text-xs text-zinc-500">Yükleniyor…</p>}
        {error && (
          <p className="rounded-xl bg-red-500/10 px-3 py-2 text-center text-xs text-red-300">
            {error}
          </p>
        )}
        {messages.map((msg) => {
          const c = CONTACTS[msg.coachId];
          const avatar = msg.coachId === "kai" ? kaiAvatar : c.avatar;
          return (
            <div key={msg.id} className="flex items-start gap-2">
              <Image src={avatar} alt="" width={32} height={32} className="h-8 w-8 rounded-full" />
              <div
                className="max-w-[85%] rounded-2xl px-3 py-2 text-sm text-white"
                style={{
                  backgroundColor: `${c.color.primary}18`,
                  border: `1px solid ${c.color.ring}`,
                }}
              >
                <p className="mb-0.5 text-[10px] font-bold text-zinc-400">{c.name}</p>
                <p>{msg.text}</p>
                <p className="mt-1 text-[10px] text-zinc-600">{msg.time}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </main>

      {unlocked && isAuthenticated && (
        <footer className="px-4 pb-8">
          <button
            type="button"
            onClick={() => void startMeeting()}
            disabled={generating}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-purple-500 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {generating ? t("team.generating") : t("team.start")}
          </button>
        </footer>
      )}
    </div>
  );
}
