"use client";

import Image from "next/image";
import { ChatMessageText } from "@/components/chat/ChatMessageText";
import { Send, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { InlineAlert } from "@/components/InlineAlert";
import { EmptyState } from "@/components/EmptyState";
import { CONTACTS, type ContactId } from "@/lib/contacts";
import { useKai } from "@/lib/kai-context";
import { useLang, type LangCode } from "@/lib/lang-context";
import { localeFor } from "@/lib/i18n/format";
import { useSession } from "@/lib/session-context";
import { apiGet, apiPost, ApiClientError } from "@/lib/api/client";
import { canUseTeamChat } from "@/lib/billing/team-chat-access";
import { errorToMessage } from "@/lib/i18n/api-error";
import { tryCreateBrowserSupabaseClient } from "@/lib/supabase/client";
import type { ChatMessageDTO } from "@/lib/types/domain.types";
import { AppHeader } from "@/components/navigation/AppHeader";
import type { Database } from "@/lib/types/database.types";

type TeamMessage = {
  id: string;
  coachId: ContactId;
  text: string;
  time: string;
  sender?: "user" | "coach";
};

type ChatMessageRow = Database["public"]["Tables"]["chat_messages"]["Row"];

type TeamPostResult = {
  messages: ChatMessageDTO[];
  awaitUser?: boolean;
  decisionComplete?: boolean;
};

function isMeetingThisWeek(messages: ChatMessageDTO[]): boolean {
  const weekStart = new Date();
  weekStart.setUTCDate(weekStart.getUTCDate() - 7);
  return messages.some(
    (m) =>
      m.messageType === "team_meeting" && new Date(m.createdAt) >= weekStart,
  );
}

function payloadAwaitsUser(payload: unknown): boolean {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return false;
  }
  const data = (payload as { data?: { await_user?: unknown } }).data;
  return data?.await_user === true;
}

function historyAwaitUser(messages: ChatMessageDTO[]): boolean {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i]!;
    if (m.sender === "coach" && payloadAwaitsUser(m.payload)) return true;
    if (m.sender === "coach" && m.messageType === "team_meeting") return false;
  }
  return false;
}

function mapDtoToTeamMessage(m: ChatMessageDTO, lang: LangCode): TeamMessage {
  return {
    id: m.id,
    coachId: (m.coachId ?? "kai") as ContactId,
    text: m.content ?? "",
    time: new Date(m.createdAt).toLocaleTimeString(localeFor(lang), {
      hour: "2-digit",
      minute: "2-digit",
    }),
    sender: m.sender === "user" ? "user" : "coach",
  };
}

function mapRowToTeamMessage(row: ChatMessageRow, lang: LangCode): TeamMessage | null {
  if (row.thread_type !== "team") return null;
  return {
    id: row.id,
    coachId: (row.coach_id ?? "kai") as ContactId,
    text: row.content ?? "",
    time: new Date(row.created_at).toLocaleTimeString(localeFor(lang), {
      hour: "2-digit",
      minute: "2-digit",
    }),
    sender: row.sender === "user" ? "user" : "coach",
  };
}

export default function TeamChatPage() {
  const { lang, t } = useLang();
  const { avatar: kaiAvatar } = useKai();
  const { isAuthenticated, profile } = useSession();
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [meetingDone, setMeetingDone] = useState(false);
  const [awaitUser, setAwaitUser] = useState(false);
  const [composerText, setComposerText] = useState("");
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
        setAwaitUser(historyAwaitUser(res.messages));
        setMessages(res.messages.map((message) => mapDtoToTeamMessage(message, lang)));
      })
      .catch(() => setError(t("team.error.load")))
      .finally(() => setLoading(false));
  }, [isAuthenticated, lang, profile?.tier, profile?.teamChatUnlocked, t]);

  // TD-005: Realtime INSERT fan-out for team thread (deduped vs POST response).
  useEffect(() => {
    if (!isAuthenticated || !profile?.id || !unlocked) return;
    const supabase = tryCreateBrowserSupabaseClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`team-chat:${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          const row = payload.new as ChatMessageRow;
          const mapped = mapRowToTeamMessage(row, lang);
          if (!mapped) return;
          if (row.message_type === "team_meeting") {
            setMeetingDone(true);
          }
          setMessages((prev) => {
            if (prev.some((m) => m.id === mapped.id)) return prev;
            return [...prev, mapped];
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isAuthenticated, lang, profile?.id, unlocked]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const appendMessages = (incoming: ChatMessageDTO[]) => {
    setMessages((prev) => {
      const next = [...prev];
      for (const m of incoming.map((message) => mapDtoToTeamMessage(message, lang))) {
        if (!next.some((x) => x.id === m.id)) next.push(m);
      }
      return next;
    });
  };

  const startMeeting = async () => {
    if (!isAuthenticated || !unlocked || generating || meetingDone) return;
    setGenerating(true);
    setError(null);
    setInfo(null);
    try {
      const res = await apiPost<TeamPostResult>("/api/chat/team");
      setMeetingDone(true);
      setAwaitUser(Boolean(res.awaitUser));
      appendMessages(res.messages);
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

  const sendReply = async () => {
    const text = composerText.trim();
    if (!text || !isAuthenticated || !unlocked || generating || !awaitUser) return;
    setGenerating(true);
    setError(null);
    setInfo(null);
    try {
      const res = await apiPost<TeamPostResult>("/api/chat/team", { message: text });
      setComposerText("");
      setAwaitUser(Boolean(res.awaitUser));
      if (res.decisionComplete) {
        setAwaitUser(false);
      }
      appendMessages(res.messages);
    } catch (e) {
      setError(errorToMessage(e, t));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="phone-shell messages-gradient relative flex min-h-0 flex-col">
      <AppHeader
        backHref="/messages"
        backLabel={t("nav.back")}
        title={
          <span className="flex flex-col items-center">
            <span>{t("messages.team_title")}</span>
            <span className="text-[10px] text-zinc-500">{t("messages.team_sub")}</span>
          </span>
        }
        trailing={<Users className="mr-3 h-5 w-5 text-purple-400" aria-hidden />}
      />

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
          <EmptyState
            title={t("team.empty")}
            icon={<Users className="h-5 w-5" aria-hidden />}
          />
        )}
        {messages.map((msg) => {
          if (msg.sender === "user") {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl bg-white/10 px-3 py-2 text-sm text-white">
                  <ChatMessageText text={msg.text} className="" />
                  <p className="mt-1 text-[10px] text-zinc-600">{msg.time}</p>
                </div>
              </div>
            );
          }
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
          {meetingDone && !awaitUser && (
            <p className="text-center text-[11px] text-zinc-500">{t("team.meeting_done_hint")}</p>
          )}
          {awaitUser ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={composerText}
                onChange={(e) => setComposerText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendReply();
                  }
                }}
                disabled={generating}
                placeholder={t("chat.placeholder.team")}
                className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 disabled:opacity-50"
                aria-label={t("chat.placeholder.team")}
              />
              <button
                type="button"
                onClick={() => void sendReply()}
                disabled={generating || !composerText.trim()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-purple-500 text-white disabled:opacity-50"
                aria-label={t("chat.aria.send")}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          ) : (
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
          )}
        </footer>
      )}
    </div>
  );
}
