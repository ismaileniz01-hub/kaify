"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera } from "lucide-react";
import { streamChatMessage, apiGet, apiPost } from "@/lib/api/client";
import type { ChatMessageDTO } from "@/lib/types/domain.types";
import type { MessageType } from "@/lib/types/database.types";
import type { ContactId } from "@/lib/contacts";
import { CONTACTS } from "@/lib/contacts";
import { ChatRichCard } from "@/components/chat/ChatRichCard";
import { useLang } from "@/lib/lang-context";
import { useKai } from "@/lib/kai-context";
import { useSession } from "@/lib/session-context";
import { apiErrorMessage } from "@/lib/i18n/api-error";

type LiveMessage = {
  id: string;
  from: "user" | "coach";
  text: string;
  time: string;
  streaming?: boolean;
  messageType?: MessageType;
  payload?: unknown;
};

type LiveChatPanelProps = {
  coachId: ContactId;
  onCoachTyping?: (typing: boolean) => void;
};

function formatTime(iso?: string): string {
  const date = iso ? new Date(iso) : new Date();
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const VISION_COACHES = new Set<ContactId>(["maya", "leo"]);

export function LiveChatPanel({ coachId, onCoachTyping }: LiveChatPanelProps) {
  const contact = CONTACTS[coachId];
  const { t } = useLang();
  const { avatar: kaiAvatar } = useKai();
  const { userProfile } = useSession();
  const { primary, primaryLight, secondary, ring, shadow } = contact.color;
  const coachAvatar = coachId === "kai" ? kaiAvatar : contact.avatar;
  const userAvatar = userProfile?.avatar ?? "/kaify-logo.png";
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [input, setInput] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingHistory(true);
    apiGet<ChatMessageDTO[]>(`/api/chat/${coachId}?limit=30`)
      .then((history) => {
        if (cancelled) return;
        setMessages(
          history.map((row) => ({
            id: row.id,
            from: row.sender === "user" ? "user" : "coach",
            text: row.content ?? "",
            time: formatTime(row.createdAt),
            messageType: row.messageType,
            payload: row.payload ?? undefined,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setError(t("chat.error.history"));
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [coachId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setSending(true);
    setError(null);

    const userMsg: LiveMessage = {
      id: `local-user-${Date.now()}`,
      from: "user",
      text,
      time: formatTime(),
    };
    const coachMsgId = `local-coach-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: coachMsgId, from: "coach", text: "", time: formatTime(), streaming: true },
    ]);

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    onCoachTyping?.(true);

    try {
      await streamChatMessage(
        coachId,
        text,
        {
          onDelta: (content) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === coachMsgId
                  ? { ...msg, text: msg.text + content, streaming: true }
                  : msg,
              ),
            );
          },
          onDone: (data) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === coachMsgId
                  ? {
                      ...msg,
                      streaming: false,
                      messageType: data.messageType as MessageType | undefined,
                      payload: data.payload,
                    }
                  : msg,
              ),
            );
            onCoachTyping?.(false);
          },
          onError: (code) => {
            setError(apiErrorMessage(code, t));
            onCoachTyping?.(false);
            setMessages((prev) => prev.filter((msg) => msg.id !== coachMsgId));
          },
        },
        abortRef.current.signal,
      );
    } catch {
      setError(t("chat.error.send"));
      onCoachTyping?.(false);
    } finally {
      setSending(false);
    }
  };

  const handlePhoto = async (file: File) => {
    if (!VISION_COACHES.has(coachId) || sending) return;
    setSending(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = reader.result as string;
        const base64 = result.split(",")[1] ?? "";
        const mimeType = file.type as "image/jpeg" | "image/png" | "image/webp";

        const analysis = await apiPost<{
          summary: string;
          messageId: string | null;
          analysis: unknown;
        }>(`/api/chat/${coachId}/analyze`, {
          imageBase64: base64,
          mimeType,
        });

        setMessages((prev) => [
          ...prev,
          {
            id: `photo-user-${Date.now()}`,
            from: "user",
            text: "📷 Fotoğraf gönderildi",
            time: formatTime(),
          },
          {
            id: analysis.messageId ?? `photo-coach-${Date.now()}`,
            from: "coach",
            text: analysis.summary,
            time: formatTime(),
            messageType: coachId === "leo" ? "score" : "analysis",
            payload: { analysis: analysis.analysis },
          },
        ]);
      } catch {
        setError(t("chat.error.photo"));
      } finally {
        setSending(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {loadingHistory && (
          <p className="text-center text-xs text-zinc-500">Yükleniyor…</p>
        )}
        {error && (
          <p className="rounded-xl bg-red-500/10 px-3 py-2 text-center text-xs text-red-300">
            {error}
          </p>
        )}
        {messages.map((msg) => {
          const isCoach = msg.from === "coach";
          const isTyping = isCoach && msg.streaming && msg.text === "";
          return (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${isCoach ? "justify-start" : "justify-end"}`}
            >
              {isCoach && (
                <div className="relative h-8 w-8 shrink-0">
                  <Image
                    src={coachAvatar}
                    alt={contact.name}
                    width={32}
                    height={32}
                    unoptimized
                    className="h-full w-full object-contain"
                  />
                </div>
              )}
              <div className="max-w-[82%]">
                {isTyping ? (
                  <div
                    className="flex items-center gap-1.5 px-5 py-3.5"
                    style={{
                      backgroundColor: `${primary}22`,
                      borderRadius: "18px 18px 18px 4px",
                      boxShadow: `0 0 20px ${ring}`,
                    }}
                  >
                    <span className="typing-dot" style={{ backgroundColor: primaryLight }} />
                    <span className="typing-dot" style={{ backgroundColor: primaryLight }} />
                    <span className="typing-dot" style={{ backgroundColor: primaryLight }} />
                  </div>
                ) : (
                  <>
                    <div
                      className="animate-message rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
                      style={
                        isCoach
                          ? {
                              backgroundColor: `${primary}18`,
                              border: `1px solid ${ring}`,
                              color: "#fff",
                              boxShadow: `0 0 15px ${ring}`,
                            }
                          : {
                              background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                              color: "#fff",
                              boxShadow: `0 4px 15px ${shadow}`,
                            }
                      }
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                      <p className="mt-1 text-[10px] opacity-60">{msg.time}</p>
                    </div>
                    {isCoach && msg.messageType && msg.payload != null ? (
                      <ChatRichCard
                        contactId={coachId}
                        messageType={msg.messageType}
                        payload={msg.payload}
                      />
                    ) : null}
                  </>
                )}
              </div>
              {!isCoach && (
                <div className="relative h-8 w-8 shrink-0">
                  <Image
                    src={userAvatar}
                    alt={userProfile?.name ?? "Me"}
                    width={32}
                    height={32}
                    unoptimized
                    className="h-full w-full rounded-full object-cover"
                  />
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <footer className="px-3 pb-8 pt-2">
        <div className="glass-input flex items-center gap-2 rounded-full px-2 py-2">
          {VISION_COACHES.has(coachId) && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handlePhoto(file);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={sending}
                className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-40"
                aria-label="Fotoğraf yükle"
              >
                <Camera className="h-4 w-4" />
              </button>
            </>
          )}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleSend()}
            placeholder="Mesajını yaz…"
            disabled={sending}
            className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending || !input.trim()}
            className="rounded-full bg-purple-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
          >
            Gönder
          </button>
        </div>
      </footer>
    </div>
  );
}
