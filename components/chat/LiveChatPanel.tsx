"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { streamChatMessage, apiGet, apiPost, ApiClientError } from "@/lib/api/client";
import type { ChatMessageDTO } from "@/lib/types/domain.types";
import type { MessageType } from "@/lib/types/database.types";
import type { ContactId } from "@/lib/contacts";
import { CONTACTS } from "@/lib/contacts";
import { ChatRichCard } from "@/components/chat/ChatRichCard";
import { AnalyticsConfirmationCard } from "@/components/chat/AnalyticsConfirmationCard";
import { ChatMessageText } from "@/components/chat/ChatMessageText";
import { InlineAlert } from "@/components/InlineAlert";
import { PhotoAnalyzeConsentModal } from "@/components/consent/PhotoAnalyzeConsentModal";
import { useLang } from "@/lib/lang-context";
import { useKai } from "@/lib/kai-context";
import { useSession } from "@/lib/session-context";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { apiErrorMessage, errorToMessage } from "@/lib/i18n/api-error";

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
  const [quotaWarning, setQuotaWarning] = useState<"LIMIT_80" | "LIMIT_100" | null>(null);
  const [hasPhotoConsent, setHasPhotoConsent] = useState<boolean | null>(null);
  const [photoConsentOpen, setPhotoConsentOpen] = useState(false);
  const pendingPhotoRef = useRef<File | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamTextRef = useRef("");
  const streamRafRef = useRef<number | null>(null);

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
    if (!VISION_COACHES.has(coachId)) return;
    apiGet<{ photoAnalysis: boolean }>("/api/consent")
      .then((status) => setHasPhotoConsent(status.photoAnalysis))
      .catch(() => setHasPhotoConsent(false));
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
    setQuotaWarning(null);

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
    streamTextRef.current = "";

    try {
      await streamChatMessage(
        coachId,
        text,
        {
          onDelta: (content) => {
            streamTextRef.current += content;
            if (streamRafRef.current !== null) return;
            streamRafRef.current = window.requestAnimationFrame(() => {
              streamRafRef.current = null;
              const nextText = streamTextRef.current;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === coachMsgId
                    ? { ...msg, text: nextText, streaming: true }
                    : msg,
                ),
              );
            });
          },
          onDone: (data) => {
            if (data.warning_trigger === "LIMIT_80" || data.warning_trigger === "LIMIT_100") {
              setQuotaWarning(data.warning_trigger);
            }
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

  const uploadPhoto = async (file: File) => {
    if (!VISION_COACHES.has(coachId) || sending) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError(t("chat.error.photoFormat"));
      return;
    }
    if (file.size > 9 * 1024 * 1024) {
      setError(t("chat.error.photoSize"));
      return;
    }

    setSending(true);
    setError(null);
    setQuotaWarning(null);
    onCoachTyping?.(true);

    // Optimistic feedback: show the photo bubble + a typing placeholder
    // immediately so the upload never looks "stuck" during the AI pipeline.
    const photoUserId = `photo-user-${Date.now()}`;
    const coachPlaceholderId = `photo-coach-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: photoUserId,
        from: "user",
        text: t("chat.photo.sent"),
        time: formatTime(),
      },
      {
        id: coachPlaceholderId,
        from: "coach",
        text: "",
        time: formatTime(),
        streaming: true,
      },
    ]);

    const clearTyping = () => {
      onCoachTyping?.(false);
      setSending(false);
    };

    const reader = new FileReader();
    reader.onerror = () => {
      setError(t("chat.error.photo"));
      setMessages((prev) => prev.filter((msg) => msg.id !== coachPlaceholderId));
      clearTyping();
    };
    reader.onload = async () => {
      try {
        const result = reader.result as string;
        const base64 = result.split(",")[1] ?? "";
        const mimeType = file.type as "image/jpeg" | "image/png" | "image/webp";

        const analysis = await apiPost<{
          summary: string;
          messageId: string | null;
          analysis: unknown;
          confirmation?: {
            pendingId: string;
            summary: string;
            content: string;
            messageId: string;
          } | null;
        }>(`/api/chat/${coachId}/analyze`, {
          imageBase64: base64,
          mimeType,
        });

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === coachPlaceholderId
              ? {
                  ...msg,
                  id: analysis.messageId ?? coachPlaceholderId,
                  text: analysis.summary,
                  streaming: false,
                  messageType: coachId === "leo" ? "score" : "analysis",
                  payload: {
                    analysis: analysis.analysis,
                    ...(analysis.confirmation
                      ? {
                          confirmation: {
                            pendingId: analysis.confirmation.pendingId,
                            summary: analysis.confirmation.summary,
                          },
                        }
                      : {}),
                  },
                }
              : msg,
          ),
        );
      } catch (err) {
        // Photo-analysis server messages (e.g. "photo not clear enough, try
        // these tips", quota limits) are already localized and actionable, so
        // surface them verbatim. Fall back to the generic code map otherwise.
        const friendly =
          err instanceof ApiClientError &&
          (err.code === "VALIDATION_ERROR" || err.code === "FORBIDDEN") &&
          err.message.trim().length > 0
            ? err.message
            : errorToMessage(err, t);
        setError(friendly);
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== coachPlaceholderId),
        );
      } finally {
        clearTyping();
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePhoto = (file: File) => {
    if (hasPhotoConsent === false) {
      pendingPhotoRef.current = file;
      setPhotoConsentOpen(true);
      return;
    }
    if (hasPhotoConsent === null) {
      pendingPhotoRef.current = file;
      setPhotoConsentOpen(true);
      return;
    }
    void uploadPhoto(file);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PhotoAnalyzeConsentModal
        open={photoConsentOpen}
        onClose={() => {
          setPhotoConsentOpen(false);
          pendingPhotoRef.current = null;
        }}
        onAccepted={() => {
          setHasPhotoConsent(true);
          setPhotoConsentOpen(false);
          const file = pendingPhotoRef.current;
          pendingPhotoRef.current = null;
          if (file) void uploadPhoto(file);
        }}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 pb-2">
        {loadingHistory && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-2xl bg-white/5" aria-hidden />
            ))}
            <p className="sr-only">{t("common.loading")}</p>
          </div>
        )}
        {quotaWarning && (
          <InlineAlert
            variant={quotaWarning === "LIMIT_100" ? "error" : "info"}
            message={
              quotaWarning === "LIMIT_100"
                ? t("chat.quota.warning_100")
                : t("chat.quota.warning_80")
            }
            dismissLabel={t("common.dismiss")}
            onDismiss={() => setQuotaWarning(null)}
          />
        )}
        {error && (
          <InlineAlert
            message={error}
            dismissLabel={t("common.dismiss")}
            onDismiss={() => setError(null)}
          />
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
                      <ChatMessageText text={msg.text} />
                      <p className="mt-1 text-[10px] opacity-60">{msg.time}</p>
                    </div>
                    {isCoach &&
                    msg.payload &&
                    typeof msg.payload === "object" &&
                    "confirmation" in (msg.payload as object) ? (
                      <AnalyticsConfirmationCard
                        payload={
                          (msg.payload as { confirmation: { pendingId: string; summary: string } })
                            .confirmation
                        }
                      />
                    ) : null}
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

      <ChatComposer
        input={input}
        onInputChange={setInput}
        onSend={() => void handleSend()}
        sending={sending}
        showCamera={VISION_COACHES.has(coachId)}
        onCameraClick={() => fileRef.current?.click()}
        onVoiceError={setError}
      />
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
    </div>
  );
}
