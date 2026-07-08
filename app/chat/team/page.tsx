"use client";

import Image from "next/image";
import Link from "next/link";
import { ChatMessageText } from "@/components/chat/ChatMessageText";
import { ArrowLeft, Send, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { InlineAlert } from "@/components/InlineAlert";
import { CONTACTS, type ContactId } from "@/lib/contacts";
import { useKai } from "@/lib/kai-context";
import { useLang } from "@/lib/lang-context";
import { useSession } from "@/lib/session-context";
import { apiGet, apiPost, ApiClientError } from "@/lib/api/client";
import { canUseTeamChat } from "@/lib/billing/team-chat-access";
import { errorToMessage } from "@/lib/i18n/api-error";
import type { ChatMessageDTO } from "@/lib/types/domain.types";

type TeamMessage = {
  id: string;
  coachId: ContactId;
  text: string;
  time: string;
};

function isMeetingThisWeek(messages: ChatMessageDTO[]): boolean {
  const weekStart = new Date();
  weekStart.setUTCDate(weekStart.getUTCDate() - 7);
  return messages.some(
    (m) =>
      m.messageType === "team_meeting" && new Date(m.createdAt) >= weekStart,
  );
}

export default function TeamChatPage() {
  const { t } = useLang();
  const { avatar: kaiAvatar } = useKai();
  const { isAuthenticated, profile } = useSession();
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [meetingDone, setMeetingDone] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const unlocked =
    !isAuthenticated ||
    canUseTeamChat({
      tier: profile?.tier,
      teamChatUnlocked: profile?.teamChatUnlocked,
    });

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    if (
      !canUseTeamChat({
        tier: profile?.tier,
        teamChatUnlocked: profile?.teamChatUnlocked,
      })
    ) {
      setLoading(false);
      return;
    }
    apiGet<{ messages: ChatMessageDTO[] }>("/api/chat/team")
      .then((res) => {
        setMeetingDone(isMeetingThisWeek(res.messages));
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
  }, [isAuthenticated, profile?.tier, profile?.teamChatUnlocked, t]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startMeeting = async () => {
    if (!isAuthenticated || !unlocked || generating || meetingDone) return;
    setGenerating(true);
    setError(null);
    setInfo(null);
    try {
      const res = await apiPost<{ messages: ChatMessageDTO[] }>("/api/chat/team");
      setMeetingDone(true);
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
      if (e instanceof ApiClientError && e.code === "CONFLICT") {
        setMeetingDone(true);
        setInfo(t("team.error.meeting_done"));
      } else {
        setError(errorToMessage(e, t));
      }
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
          aria-label={t("nav.back")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex flex-1 flex-col items-center">
          <h1 className="text-sm font-semibold text-white">{t("messages.team_title")}</h1>
          <p className="text-[10px] text-zinc-500">{t("messages.team_sub")}</p>
        </div>
        <Users className="h-5 w-5 text-purple-400" aria-hidden />
      </header>

      {!unlocked && (
        <InlineAlert
          variant="info"
          className="mx-4"
          message={
            profile?.tier === "essential"
              ? t("team.locked_plan")
              : t("team.locked")
          }
          dismissLabel={t("common.dismiss")}
        />
      )}

      <main className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {loading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-2xl bg-white/5" aria-hidden />
            ))}
            <p className="sr-only">{t("common.loading")}</p>
          </div>
        )}
        {error && (
          <InlineAlert
            message={error}
            dismissLabel={t("common.dismiss")}
            onDismiss={() => setError(null)}
          />
        )}
        {info && (
          <InlineAlert
            variant="info"
            message={info}
            dismissLabel={t("common.dismiss")}
            onDismiss={() => setInfo(null)}
          />
        )}
        {!loading && messages.length === 0 && unlocked && !error && (
          <p className="py-8 text-center text-xs text-zinc-500">{t("team.empty")}</p>
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
                <ChatMessageText text={msg.text} className="" />
                <p className="mt-1 text-[10px] text-zinc-600">{msg.time}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </main>

      {unlocked && isAuthenticated && (
        <footer className="space-y-2 px-4 pb-8">
          {meetingDone && (
            <p className="text-center text-[11px] text-zinc-500">{t("team.meeting_done_hint")}</p>
          )}
          <button
            type="button"
            onClick={() => void startMeeting()}
            disabled={generating || meetingDone}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-purple-500 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {generating
              ? t("team.generating")
              : meetingDone
                ? t("team.meeting_done_btn")
                : t("team.start")}
          </button>
        </footer>
      )}
    </div>
  );
}
