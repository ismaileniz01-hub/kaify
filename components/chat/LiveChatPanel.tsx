"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  streamChatMessage,
  apiGet,
  apiDelete,
  apiPost,
  createIdempotencyKey,
} from "@/lib/api/client";
import type { ChatMessageDTO } from "@/lib/types/domain.types";
import type { MessageType } from "@/lib/types/database.types";
import type { ContactId } from "@/lib/contacts";
import { CONTACTS } from "@/lib/contacts";
import { publicAssetUrl } from "@/lib/public-asset-url";
import { ChatRichCard } from "@/components/chat/ChatRichCard";
import { AnalyticsConfirmationCard } from "@/components/chat/AnalyticsConfirmationCard";
import { ChatMessageText } from "@/components/chat/ChatMessageText";
import { InlineAlert } from "@/components/InlineAlert";
import { EmptyState } from "@/components/EmptyState";
import { PhotoAnalyzeConsentModal } from "@/components/consent/PhotoAnalyzeConsentModal";
import { useLang } from "@/lib/lang-context";
import { formatTime } from "@/lib/i18n/format";
import { useKai } from "@/lib/kai-context";
import { useSession } from "@/lib/session-context";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { errorToMessage, quotaErrorMessage, quotaResourceFromError, visionQuotaResourceFromError, isAnalyzeQuotaDenied } from "@/lib/i18n/api-error";
import { MessageCircle, MoreVertical } from "lucide-react";
import { prefersReducedMotion } from "@/lib/motion/perf-guards";
import {
  markMessageDelivered,
  markMessageFailed,
  shouldReuseIdempotencyKeyOnRetry,
  type MessageDeliveryStatus,
} from "@/lib/chat/message-lifecycle";

/** Keep DOM light when long threads accumulate locally after send. */
const MESSAGE_RENDER_WINDOW = 48;

type LiveMessage = {
  id: string;
  from: "user" | "coach";
  text: string;
  time: string;
  streaming?: boolean;
  messageType?: MessageType;
  payload?: unknown;
  status?: MessageDeliveryStatus;
  idempotencyKey?: string;
  /** Local-only: photo upload that can be retried. */
  photoRetry?: boolean;
};

type LiveChatPanelProps = {
  coachId: ContactId;
  onCoachTyping?: (typing: boolean) => void;
};

function formatMessageTime(
  iso: string | undefined,
  lang: Parameters<typeof formatTime>[1],
): string {
  return formatTime(iso ?? new Date(), lang);
}

const VISION_COACHES = new Set<ContactId>(["maya", "leo"]);

function canDeleteMessage(msg: LiveMessage): boolean {
  return (
    msg.from === "user" &&
    !msg.streaming &&
    msg.status !== "sending" &&
    !msg.id.startsWith("local-")
  );
}

export function LiveChatPanel({ coachId, onCoachTyping }: LiveChatPanelProps) {
  const contact = CONTACTS[coachId];
  const { t, lang } = useLang();
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
  const [errorUpgrade, setErrorUpgrade] = useState(false);
  const [quotaWarning, setQuotaWarning] = useState<"LIMIT_80" | "LIMIT_100" | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const openMenuRef = useRef<HTMLDivElement>(null);
  const [hasPhotoConsent, setHasPhotoConsent] = useState<boolean | null>(null);
  const [photoConsentOpen, setPhotoConsentOpen] = useState(false);
  const pendingPhotoRef = useRef<File | null>(null);
  const photoFileByMsgIdRef = useRef<Map<string, { file: File; note: string }>>(
    new Map(),
  );
  const [composerPhoto, setComposerPhoto] = useState<{
    file: File;
    url: string;
  } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamTextRef = useRef("");
  const streamRafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
      if (streamRafRef.current !== null) {
        cancelAnimationFrame(streamRafRef.current);
        streamRafRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (composerPhoto?.url) URL.revokeObjectURL(composerPhoto.url);
    };
  }, [composerPhoto?.url]);

  useEffect(() => {
    if (!openMenuId) return;
    const onPointerDown = (event: PointerEvent) => {
      if (openMenuRef.current?.contains(event.target as Node)) return;
      setOpenMenuId(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openMenuId]);

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
            time: formatMessageTime(row.createdAt, lang),
            messageType: row.messageType,
            payload: row.payload ?? undefined,
            status: "delivered" as const,
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
  }, [coachId, t, lang]);

  useEffect(() => {
    if (!VISION_COACHES.has(coachId)) return;
    let cancelled = false;
    apiGet<{ photoAnalysis: boolean }>("/api/consent")
      .then((status) => {
        if (!cancelled) setHasPhotoConsent(status.photoAnalysis);
      })
      .catch(() => {
        if (!cancelled) setHasPhotoConsent(false);
      });
    return () => {
      cancelled = true;
    };
  }, [coachId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, [messages, sending]);

  const sendTextMessage = async (
    text: string,
    options?: {
      existingUserMsgId?: string;
      idempotencyKey?: string;
    },
  ) => {
    if (!text || sending) return;

    setSending(true);
    setError(null);
    setErrorUpgrade(false);
    setQuotaWarning(null);

    const idempotencyKey =
      options?.idempotencyKey &&
      shouldReuseIdempotencyKeyOnRetry("failed", options.idempotencyKey)
        ? options.idempotencyKey
        : createIdempotencyKey();

    const userMsgId = options?.existingUserMsgId ?? `local-user-${Date.now()}`;
    const coachMsgId = `local-coach-${Date.now()}`;

    if (options?.existingUserMsgId) {
      setMessages((prev) => [
        ...prev.map((msg) =>
          msg.id === userMsgId
            ? { ...msg, status: "sending" as const, idempotencyKey }
            : msg,
        ),
        {
          id: coachMsgId,
          from: "coach",
          text: "",
          time: formatMessageTime(undefined, lang),
          streaming: true,
        },
      ]);
    } else {
      const userMsg: LiveMessage = {
        id: userMsgId,
        from: "user",
        text,
        time: formatMessageTime(undefined, lang),
        status: "sending",
        idempotencyKey,
      };
      setMessages((prev) => [
        ...prev,
        userMsg,
        {
          id: coachMsgId,
          from: "coach",
          text: "",
          time: formatMessageTime(undefined, lang),
          streaming: true,
        },
      ]);
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    onCoachTyping?.(true);
    streamTextRef.current = "";

    const failUserMessage = () => {
      setMessages((prev) =>
        markMessageFailed(
          prev.filter((msg) => msg.id !== coachMsgId),
          userMsgId,
        ),
      );
    };

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
            if (streamRafRef.current !== null) {
              cancelAnimationFrame(streamRafRef.current);
              streamRafRef.current = null;
            }
            const finalText =
              typeof data.content === "string" && data.content.trim().length > 0
                ? data.content
                : streamTextRef.current || "";
            if (data.warning_trigger === "LIMIT_80" || data.warning_trigger === "LIMIT_100") {
              setQuotaWarning(data.warning_trigger);
            }
            setMessages((prev) =>
              markMessageDelivered(
                prev.map((msg) =>
                  msg.id === coachMsgId
                    ? {
                        ...msg,
                        id: data.messageId ?? msg.id,
                        text: finalText || msg.text,
                        streaming: false,
                        messageType: data.messageType as MessageType | undefined,
                        payload: data.payload,
                      }
                    : msg,
                ),
                userMsgId,
              ),
            );
            onCoachTyping?.(false);
          },
          onCard: (data) => {
            setMessages((prev) =>
              prev.map((msg) => {
                const isTarget =
                  msg.id === coachMsgId ||
                  (data.messageId != null && msg.id === data.messageId);
                if (!isTarget) return msg;
                return {
                  ...msg,
                  id: data.messageId ?? msg.id,
                  streaming: false,
                  messageType:
                    (data.messageType as MessageType | undefined) ?? msg.messageType,
                  payload: data.payload ?? msg.payload,
                };
              }),
            );
          },
          onError: (code, details) => {
            const err = { code, details };
            const quota = quotaResourceFromError(err);
            setErrorUpgrade(Boolean(quota));
            setError(errorToMessage(err, t));
            onCoachTyping?.(false);
            failUserMessage();
          },
        },
        abortRef.current.signal,
        idempotencyKey,
      );
    } catch {
      setError(t("chat.error.send"));
      onCoachTyping?.(false);
      failUserMessage();
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    if (sending) return;
    const text = input.trim();
    if (composerPhoto) {
      const file = composerPhoto.file;
      setComposerPhoto(null);
      setInput("");
      await uploadPhoto(file, { note: text });
      return;
    }
    if (!text) return;
    setInput("");
    await sendTextMessage(text);
  };

  const handleRetry = (msg: LiveMessage) => {
    if (sending || msg.from !== "user" || msg.status !== "failed") return;
    if (msg.photoRetry) {
      const pending = photoFileByMsgIdRef.current.get(msg.id);
      if (pending) {
        void uploadPhoto(pending.file, {
          existingUserMsgId: msg.id,
          note: pending.note,
        });
      }
      return;
    }
    if (
      shouldReuseIdempotencyKeyOnRetry(msg.status, msg.idempotencyKey)
    ) {
      void sendTextMessage(msg.text, {
        existingUserMsgId: msg.id,
        idempotencyKey: msg.idempotencyKey,
      });
    }
  };

  const handleDelete = async (msg: LiveMessage) => {
    if (msg.streaming || msg.status === "sending" || deletingId) return;
    const confirmed =
      typeof window === "undefined"
        ? false
        : window.confirm(
            t("chat.delete.confirm"),
          );
    if (!confirmed) return;
    setDeletingId(msg.id);
    setError(null);
    try {
      const result = await apiDelete<{
        deletedIds: string[];
      }>(`/api/chat/messages/${msg.id}`);
      const removed = new Set(result.deletedIds ?? [msg.id]);
      setMessages((prev) => prev.filter((item) => !removed.has(item.id)));
    } catch (err) {
      setError(errorToMessage(err, t));
    } finally {
      setDeletingId(null);
    }
  };

  const uploadPhoto = async (
    file: File,
    options?: { existingUserMsgId?: string; note?: string },
  ) => {
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
    setErrorUpgrade(false);
    setQuotaWarning(null);
    onCoachTyping?.(true);

    const caption = options?.note?.trim() ?? "";
    const photoUserId = options?.existingUserMsgId ?? `photo-user-${Date.now()}`;
    const coachPlaceholderId = `photo-coach-${Date.now()}`;
    photoFileByMsgIdRef.current.set(photoUserId, { file, note: caption });

    if (options?.existingUserMsgId) {
      setMessages((prev) => [
        ...prev.map((msg) =>
          msg.id === photoUserId
            ? { ...msg, status: "sending" as const, photoRetry: true }
            : msg,
        ),
        {
          id: coachPlaceholderId,
          from: "coach",
          text: "",
          time: formatMessageTime(undefined, lang),
          streaming: true,
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: photoUserId,
          from: "user",
          text: caption || t("chat.photo.sent"),
          time: formatMessageTime(undefined, lang),
          status: "sending",
          photoRetry: true,
        },
        {
          id: coachPlaceholderId,
          from: "coach",
          text: "",
          time: formatMessageTime(undefined, lang),
          streaming: true,
        },
      ]);
    }

    const clearTyping = () => {
      onCoachTyping?.(false);
      setSending(false);
    };

    const failPhotoMessage = () => {
      setMessages((prev) =>
        markMessageFailed(
          prev.filter((msg) => msg.id !== coachPlaceholderId),
          photoUserId,
        ).map((msg) =>
          msg.id === photoUserId ? { ...msg, photoRetry: true } : msg,
        ),
      );
    };

    const reader = new FileReader();
    reader.onerror = () => {
      setError(t("chat.error.photo"));
      failPhotoMessage();
      clearTyping();
    };
    reader.onload = async () => {
      try {
        const result = reader.result as string;
        const base64 = result.split(",")[1] ?? "";
        const mimeType = file.type as "image/jpeg" | "image/png" | "image/webp";

        const analysis = await apiPost<
          | {
              quotaExceeded: true;
              resource: "maya_photo" | "leo_photo" | "text_tokens";
            }
          | {
              summary: string;
              messageId: string | null;
              analysis: unknown;
              confirmation?: {
                pendingId: string;
                summary: string;
                content: string;
                messageId: string;
              } | null;
            }
        >(`/api/chat/${coachId}/analyze`, {
          imageBase64: base64,
          mimeType,
          ...(caption ? { note: caption.slice(0, 500) } : {}),
        });

        if (isAnalyzeQuotaDenied(analysis)) {
          const text = quotaErrorMessage(analysis.resource, t);
          setErrorUpgrade(true);
          setError(text);
          photoFileByMsgIdRef.current.delete(photoUserId);
          setMessages((prev) =>
            markMessageDelivered(
              prev.map((msg) =>
                msg.id === coachPlaceholderId
                  ? { ...msg, text, streaming: false }
                  : msg.id === photoUserId
                    ? { ...msg, photoRetry: undefined }
                    : msg,
              ),
              photoUserId,
            ),
          );
          return;
        }

        photoFileByMsgIdRef.current.delete(photoUserId);
        setMessages((prev) =>
          markMessageDelivered(
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
                : msg.id === photoUserId
                  ? { ...msg, photoRetry: undefined }
                  : msg,
            ),
            photoUserId,
          ),
        );
      } catch (err) {
        const quota = visionQuotaResourceFromError(coachId, err);
        if (quota) {
          const text = quotaErrorMessage(quota, t);
          setErrorUpgrade(true);
          setError(text);
          photoFileByMsgIdRef.current.delete(photoUserId);
          setMessages((prev) =>
            markMessageDelivered(
              prev.map((msg) =>
                msg.id === coachPlaceholderId
                  ? { ...msg, text, streaming: false }
                  : msg.id === photoUserId
                    ? { ...msg, photoRetry: undefined }
                    : msg,
              ),
              photoUserId,
            ),
          );
        } else {
          setErrorUpgrade(false);
          setError(errorToMessage(err, t));
          failPhotoMessage();
        }
      } finally {
        clearTyping();
      }
    };
    reader.readAsDataURL(file);
  };

  const attachPhotoToComposer = (file: File) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError(t("chat.error.photoFormat"));
      return;
    }
    if (file.size > 9 * 1024 * 1024) {
      setError(t("chat.error.photoSize"));
      return;
    }
    setError(null);
    setErrorUpgrade(false);
    setComposerPhoto({ file, url: URL.createObjectURL(file) });
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
    attachPhotoToComposer(file);
  };

  const youLabel = t("chat.a11y.you");

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
          if (file) attachPhotoToComposer(file);
        }}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 pb-36">
        {loadingHistory && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="premium-skeleton h-12 rounded-2xl" aria-hidden />
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
            variant={errorUpgrade ? "info" : "error"}
            message={error}
            dismissLabel={t("common.dismiss")}
            actionHref={errorUpgrade ? "/pricing" : undefined}
            actionLabel={errorUpgrade ? t("usage.upgrade") : undefined}
            onDismiss={() => {
              setError(null);
              setErrorUpgrade(false);
            }}
          />
        )}
        {!loadingHistory && messages.length === 0 && !error && (
          <EmptyState
            title={t("chat.empty.title")}
            subtitle={t("chat.empty.subtitle")}
            icon={<MessageCircle className="h-5 w-5" aria-hidden />}
            tone="info"
          />
        )}
        <div
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-label={t("chat.a11y.log")}
        >
          <div role="list" className="flex flex-col gap-3">
            {messages.slice(-MESSAGE_RENDER_WINDOW).map((msg) => {
              const isCoach = msg.from === "coach";
              const isTyping = isCoach && msg.streaming && msg.text === "";
              const isStreamingText = isCoach && msg.streaming && msg.text !== "";
              const isFailed = msg.status === "failed";
              const authorLabel = isCoach ? contact.name : youLabel;
              const bubbleAriaLabel = isFailed
                ? `${authorLabel}: ${msg.text}. ${t("chat.message.failed")}`
                : `${authorLabel}: ${msg.text}`;

              return (
                <div
                  key={msg.id}
                  role="listitem"
                  className={`flex items-end gap-2 ${isCoach ? "justify-start" : "justify-end"}`}
                >
                  {isCoach && (
                    <div className="relative h-8 w-8 shrink-0" aria-hidden>
                      <Image
                        src={publicAssetUrl(coachAvatar)}
                        alt=""
                        width={32}
                        height={32}
                        unoptimized
                        className="h-full w-full object-contain"
                      />
                    </div>
                  )}
                  <div className="max-w-[82%]">
                    {isTyping ? (
                      <>
                        <div
                          className="flex items-center gap-1.5 px-5 py-3.5"
                          aria-hidden
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
                        <p className="sr-only" aria-live="polite">
                          {t("chat.a11y.typing", { name: contact.name })}
                        </p>
                      </>
                    ) : (
                      <>
                        <div
                          className={`chat-message-bubble animate-message rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                            isFailed ? "opacity-80 ring-1 ring-red-400/50" : ""
                          }`}
                          aria-label={bubbleAriaLabel}
                          aria-busy={isStreamingText || undefined}
                          aria-invalid={isFailed || undefined}
                          style={
                            isCoach
                              ? {
                                  backgroundColor: `${primary}18`,
                                  border: `1px solid ${ring}`,
                                  color: "#fff",
                                  boxShadow: `0 8px 22px rgba(0,0,0,0.18), 0 0 10px ${ring}`,
                                }
                              : {
                                  background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                                  color: "#fff",
                                  boxShadow: `0 8px 22px ${shadow}`,
                                  ...(isFailed
                                    ? { border: "1px solid rgba(248,113,113,0.55)" }
                                    : {}),
                                }
                          }
                        >
                          <ChatMessageText text={msg.text} />
                          <p className="chat-message-time mt-1 opacity-60">{msg.time}</p>
                        </div>
                        {isFailed && (
                          <div
                            role="status"
                            className="mt-1.5 flex items-center justify-end gap-2"
                          >
                            <span className="text-[11px] text-red-300/90">
                              {t("chat.message.failed")}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRetry(msg)}
                              disabled={sending}
                              className="rounded-md px-2 py-0.5 text-[11px] font-medium text-red-200 underline-offset-2 hover:underline disabled:opacity-50"
                            >
                              {t("chat.message.retry")}
                            </button>
                          </div>
                        )}
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
                  {!isCoach && canDeleteMessage(msg) && (
                    <div
                      ref={openMenuId === msg.id ? openMenuRef : undefined}
                      className="relative shrink-0 self-center"
                    >
                      <button
                        type="button"
                        aria-label={t("chat.message.menu")}
                        aria-haspopup="menu"
                        aria-expanded={openMenuId === msg.id}
                        onClick={() =>
                          setOpenMenuId((current) => (current === msg.id ? null : msg.id))
                        }
                        className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-200"
                      >
                        <MoreVertical className="h-4 w-4" aria-hidden />
                      </button>
                      {openMenuId === msg.id && (
                        <div
                          role="menu"
                          className="absolute right-0 top-full z-20 mt-1 min-w-[9rem] overflow-hidden rounded-xl border border-white/10 bg-zinc-900/95 py-1 shadow-xl backdrop-blur-sm"
                        >
                          <button
                            role="menuitem"
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              void handleDelete(msg);
                            }}
                            disabled={deletingId != null}
                            className="w-full px-3 py-2 text-left text-sm text-red-300 transition-colors hover:bg-white/5 disabled:opacity-50"
                          >
                            {deletingId === msg.id
                              ? t("common.loading")
                              : t("chat.delete.action")}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {!isCoach && (
                    <div className="relative h-8 w-8 shrink-0" aria-hidden>
                      <Image
                        src={publicAssetUrl(userAvatar)}
                        alt=""
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
          </div>
        </div>
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
        attachmentPreviewUrl={composerPhoto?.url ?? null}
        onRemoveAttachment={() => setComposerPhoto(null)}
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
