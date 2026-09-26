"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type Ref } from "react";
import {
  streamChatMessage,
  apiGet,
  apiPost,
  createIdempotencyKey,
} from "@/lib/api/client";
import type { ChatMessageDTO } from "@/lib/types/domain.types";
import type { MessageType } from "@/lib/types/database.types";
import type { ContactId } from "@/lib/contacts";
import { CONTACTS } from "@/lib/contacts";
import { publicAssetUrl } from "@/lib/public-asset-url";
import { ChatRichCard } from "@/components/chat/ChatRichCard";
import { ChatPinnedBanner } from "@/components/chat/ChatPinnedBanner";
import { AnalyticsConfirmationCard } from "@/components/chat/AnalyticsConfirmationCard";
import { ChatMessageText } from "@/components/chat/ChatMessageText";
import { InlineAlert } from "@/components/InlineAlert";
import { EmptyState } from "@/components/EmptyState";
import { CoachStarterChips } from "@/components/chat/CoachStarterChips";
import { PhotoAnalyzeConsentModal } from "@/components/consent/PhotoAnalyzeConsentModal";
import { ImagePickerModal } from "@/components/ImagePickerModal";
import { useLang } from "@/lib/lang-context";
import { formatTime } from "@/lib/i18n/format";
import { useKai } from "@/lib/kai-context";
import { useSession } from "@/lib/session-context";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatDeliveryTicks } from "@/components/chat/ChatDeliveryTicks";
import { chatBubbleEnterClass } from "@/lib/chat/message-motion";
import {
  ChatPhotoError,
  CHAT_PHOTO_MAX_SOURCE_BYTES,
  canAttachChatPhoto,
  prepareChatPhoto,
} from "@/lib/chat/prepare-chat-photo";
import { errorToMessage, photoAnalysisFailureText, quotaErrorMessage, quotaResourceFromError, visionQuotaResourceFromError, isAnalyzeQuotaDenied } from "@/lib/i18n/api-error";
import { useToast } from "@/components/ui/ToastProvider";
import { coachRetryLine, isSoftCoachFailure, isUsableCoachReply } from "@/lib/kaios/coach-retry";
import { ArrowDown, MessageCircle, MoreVertical, Check } from "lucide-react";
import {
  ChatAvatarSlot,
  CoachChatAvatar,
  UserChatAvatar,
} from "@/components/chat/ChatAvatar";
import { chatBubbleRadius, chatGroupPosition } from "@/lib/chat/message-groups";
import { isNearBottom } from "@/lib/chat/scroll-anchor";
import {
  KEYBOARD_INSET_EVENT,
  type KeyboardMeasurement,
} from "@/lib/native/keyboard-inset";
import {
  markMessageDelivered,
  markMessageFailed,
  shouldReuseIdempotencyKeyOnRetry,
  type MessageDeliveryStatus,
} from "@/lib/chat/message-lifecycle";
import { consumeAlexDraft } from "@/lib/chat/alex-draft";
import {
  dequeueOfflineChats,
  enqueueOfflineChat,
  offlineQueueCount,
} from "@/lib/chat/offline-queue";
import {
  findLatestPinnableMessage,
  pinnedCardMetric,
} from "@/lib/chat/pinned-card";

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
  /** Blob URL shown on the bubble until the photo leaves the composer. */
  photoPreviewUrl?: string;
  /** Play enter motion once (in-session messages only). */
  enter?: boolean;
  /** This-session message — coach copy types in instead of popping. */
  fresh?: boolean;
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

const PERSISTED_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function newPersistedMessageId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return createIdempotencyKey();
}

/**
 * Lives in the bubble's meta row; the menu is positioned against the bubble
 * (which is `relative`) and opens toward the screen edge the bubble hugs.
 */
function MessageOverflowMenu({
  open,
  menuRef,
  label,
  deleteLabel,
  deleting,
  align,
  onToggle,
  onDelete,
}: {
  open: boolean;
  menuRef?: Ref<HTMLDivElement>;
  label: string;
  deleteLabel: string;
  deleting: boolean;
  align: "start" | "end";
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div ref={menuRef} className="contents">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        className="-my-2 -me-2 ms-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
      >
        <MoreVertical className="h-3.5 w-3.5" aria-hidden />
      </button>
      {open ? (
        <div
          role="menu"
          className={`absolute top-full z-20 mt-1 min-w-[9rem] overflow-hidden rounded-xl border border-white/10 bg-zinc-900/95 py-1 shadow-xl backdrop-blur-sm ${
            align === "start" ? "start-0" : "end-0"
          }`}
        >
          <button
            role="menuitem"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            disabled={deleting}
            className="w-full px-3 py-2 text-start text-sm text-red-300 transition-colors hover:bg-white/5 disabled:opacity-50"
          >
            {deleteLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function canSelectForDelete(msg: LiveMessage): boolean {
  return (
    !msg.streaming &&
    msg.status !== "sending" &&
    PERSISTED_ID_RE.test(msg.id)
  );
}

export function LiveChatPanel({ coachId, onCoachTyping }: LiveChatPanelProps) {
  const contact = CONTACTS[coachId];
  const { t, lang } = useLang();
  const { toast } = useToast();
  const { avatar: kaiAvatar } = useKai();
  const { userProfile, refreshHome } = useSession();
  const { primary, primaryLight, secondary, ring, shadow } = contact.color;
  const coachAvatar = coachId === "kai" ? kaiAvatar : contact.avatar;
  const userAvatar = userProfile?.avatar;
  const userName = userProfile?.name;
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [input, setInput] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorUpgrade, setErrorUpgrade] = useState(false);
  const [quotaWarning, setQuotaWarning] = useState<"LIMIT_80" | "LIMIT_100" | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectingDelete, setSelectingDelete] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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
  const listRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const renderedCountRef = useRef(0);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const streamTextRef = useRef("");
  const streamRafRef = useRef<number | null>(null);
  const transferredPreviewRef = useRef<Set<string>>(new Set());
  const sendTextMessageRef = useRef<(text: string) => Promise<void>>(
    async () => undefined,
  );
  const [queueNotice, setQueueNotice] = useState(false);
  const pendingDeleteTimerRef = useRef<number | null>(null);
  /** Collapsed by default so the pinned card never crowds the thread. */
  const [pinOpen, setPinOpen] = useState(false);

  useEffect(() => {
    const previewUrls = transferredPreviewRef.current;
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
      if (streamRafRef.current !== null) {
        cancelAnimationFrame(streamRafRef.current);
        streamRafRef.current = null;
      }
      for (const url of previewUrls) {
        URL.revokeObjectURL(url);
      }
      previewUrls.clear();
    };
  }, []);

  useEffect(() => {
    const url = composerPhoto?.url;
    const transferred = transferredPreviewRef.current;
    return () => {
      if (url && !transferred.has(url)) {
        URL.revokeObjectURL(url);
      }
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
        const mapped: LiveMessage[] = history.map((row) => ({
          id: row.id,
          from: row.sender === "user" ? "user" : "coach",
          text: row.content ?? "",
          time: formatMessageTime(row.createdAt, lang),
          messageType: row.messageType,
          payload: row.payload ?? undefined,
          status: "delivered" as const,
        }));
        setMessages(mapped);
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
    if (coachId !== "alex") return;
    const draft = consumeAlexDraft();
    if (draft) setInput((current) => current || draft);
  }, [coachId]);

  useEffect(() => {
    setQueueNotice(offlineQueueCount(coachId) > 0);
    const flush = () => {
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      const queued = dequeueOfflineChats(coachId);
      if (queued.length === 0) return;
      setQueueNotice(false);
      void (async () => {
        for (const item of queued) {
          await sendTextMessageRef.current(item.text);
        }
      })();
    };
    window.addEventListener("online", flush);
    flush();
    return () => window.removeEventListener("online", flush);
  }, [coachId]);

  const sendTextMessage = async (
    text: string,
    options?: {
      existingUserMsgId?: string;
      idempotencyKey?: string;
    },
  ) => {
    if (!text || sending) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      enqueueOfflineChat(coachId, text);
      setQueueNotice(true);
      setError(t("chat.queued"));
      return;
    }

    setSending(true);
    setError(null);
    setErrorUpgrade(false);
    setQuotaWarning(null);
    stickToBottomRef.current = true;
    setShowJumpToLatest(false);

    const idempotencyKey =
      options?.idempotencyKey &&
      shouldReuseIdempotencyKeyOnRetry("failed", options.idempotencyKey)
        ? options.idempotencyKey
        : createIdempotencyKey();

    const userMsgId = options?.existingUserMsgId ?? newPersistedMessageId();
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
          enter: true,
          fresh: true,
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
        enter: true,
        fresh: true,
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
          enter: true,
          fresh: true,
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
            if (!streamTextRef.current) onCoachTyping?.(false);
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
                prev.map((msg) => {
                  if (msg.id === coachMsgId) {
                    return {
                      ...msg,
                      id: data.messageId ?? msg.id,
                      text: finalText || msg.text,
                      streaming: false,
                      messageType: data.messageType as MessageType | undefined,
                      payload: data.payload,
                    };
                  }
                  if (
                    msg.id === userMsgId &&
                    typeof data.userMessageId === "string" &&
                    data.userMessageId.length > 0
                  ) {
                    return { ...msg, id: data.userMessageId };
                  }
                  return msg;
                }),
                typeof data.userMessageId === "string" && data.userMessageId.length > 0
                  ? data.userMessageId
                  : userMsgId,
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
            if (quota) {
              setErrorUpgrade(true);
              setError(errorToMessage(err, t));
              onCoachTyping?.(false);
              failUserMessage();
              return;
            }
            if (isSoftCoachFailure(code, details)) {
              if (streamRafRef.current !== null) {
                cancelAnimationFrame(streamRafRef.current);
                streamRafRef.current = null;
              }
              const streamed = streamTextRef.current.trim();
              const kept = isUsableCoachReply(streamed)
                ? streamed
                : coachRetryLine(lang);
              setMessages((prev) =>
                markMessageDelivered(
                  prev.map((msg) =>
                    msg.id === coachMsgId
                      ? { ...msg, text: kept, streaming: false }
                      : msg,
                  ),
                  userMsgId,
                ),
              );
              onCoachTyping?.(false);
              return;
            }
            setErrorUpgrade(false);
            setError(errorToMessage(err, t));
            onCoachTyping?.(false);
            failUserMessage();
          },
        },
        abortRef.current.signal,
        idempotencyKey,
        PERSISTED_ID_RE.test(userMsgId) ? userMsgId : undefined,
        lang,
      );
    } catch {
      setError(t("chat.error.send"));
      onCoachTyping?.(false);
      failUserMessage();
    } finally {
      onCoachTyping?.(false);
      setSending(false);
    }
  };

  sendTextMessageRef.current = sendTextMessage;

  const scrollToLatest = useCallback((smooth = false) => {
    const list = listRef.current;
    stickToBottomRef.current = true;
    setShowJumpToLatest(false);
    if (!list) return;
    list.scrollTo({ top: list.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const onScroll = () => {
      const atBottom = isNearBottom(list);
      stickToBottomRef.current = atBottom;
      if (atBottom) setShowJumpToLatest(false);
    };
    // Keyboard, composer growth, images and rich cards resize the list or its
    // content without a scroll event; keep the latest message in view.
    const follow = () => {
      if (stickToBottomRef.current) list.scrollTop = list.scrollHeight;
    };
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(follow);
    observer?.observe(list);
    if (threadRef.current) observer?.observe(threadRef.current);
    const onKeyboard = (event: Event) => {
      if ((event as CustomEvent<KeyboardMeasurement>).detail?.open) {
        setPinOpen(false);
      }
      follow();
    };
    list.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener(KEYBOARD_INSET_EVENT, onKeyboard);
    return () => {
      observer?.disconnect();
      list.removeEventListener("scroll", onScroll);
      window.removeEventListener(KEYBOARD_INSET_EVENT, onKeyboard);
    };
  }, []);

  useEffect(() => {
    const list = listRef.current;
    const grew = messages.length > renderedCountRef.current;
    renderedCountRef.current = messages.length;
    if (!list) return;
    if (stickToBottomRef.current) {
      list.scrollTop = list.scrollHeight;
    } else if (grew) {
      setShowJumpToLatest(true);
    }
  }, [messages, sending]);

  const handleSend = async () => {
    if (sending) return;
    const text = input.trim();
    if (composerPhoto) {
      const file = composerPhoto.file;
      const previewUrl = composerPhoto.url;
      transferredPreviewRef.current.add(previewUrl);
      setComposerPhoto(null);
      setInput("");
      await uploadPhoto(file, { note: text, previewUrl });
      return;
    }
    if (!text) return;
    setInput("");
    await sendTextMessage(text);
  };

  const reportCoachMessage = async (messageId: string, text: string) => {
    const excerpt = text.trim().slice(0, 280);
    try {
      await apiPost("/api/support", {
        message: `[AI content report] coach=${coachId} messageId=${messageId}\n${excerpt}`,
      }, { "Idempotency-Key": createIdempotencyKey() });
      toast({ title: t("chat.message.report_sent"), tone: "success" });
    } catch {
      toast({ title: t("chat.message.report_failed"), tone: "error" });
    }
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

  const enterDeleteSelect = (msg: LiveMessage) => {
    if (!canSelectForDelete(msg) || deleting) return;
    setOpenMenuId(null);
    setSelectingDelete(true);
    setSelectedIds(new Set([msg.id]));
  };

  const toggleDeleteSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const cancelDeleteSelect = () => {
    if (deleting) return;
    setSelectingDelete(false);
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = async () => {
    if (deleting || selectedIds.size === 0) return;
    const ids = [...selectedIds];
    const confirmed =
      typeof window === "undefined"
        ? false
        : window.confirm(t("chat.delete.confirmSelected", { count: ids.length }));
    if (!confirmed) return;

    const previous = messages;
    const removed = new Set(ids);
    setMessages((prev) => prev.filter((item) => !removed.has(item.id)));
    setSelectingDelete(false);
    setSelectedIds(new Set());
    setError(null);

    if (pendingDeleteTimerRef.current) {
      window.clearTimeout(pendingDeleteTimerRef.current);
    }

    const commit = async () => {
      pendingDeleteTimerRef.current = null;
      try {
        await apiPost<{ deletedIds: string[] }>("/api/chat/messages/delete", {
          ids,
        });
      } catch (err) {
        setMessages(previous);
        setError(errorToMessage(err, t));
      }
    };

    pendingDeleteTimerRef.current = window.setTimeout(() => {
      void commit();
    }, 7000);

    toast({
      title: t("chat.delete.deleted"),
      duration: 7000,
      action: {
        label: t("chat.delete.undo"),
        onClick: () => {
          if (pendingDeleteTimerRef.current) {
            window.clearTimeout(pendingDeleteTimerRef.current);
            pendingDeleteTimerRef.current = null;
          }
          setMessages(previous);
        },
      },
    });
  };

  const uploadPhoto = async (
    file: File,
    options?: { existingUserMsgId?: string; note?: string; previewUrl?: string },
  ) => {
    if (!VISION_COACHES.has(coachId) || sending) return;

    if (!canAttachChatPhoto(file)) {
      setError(
        file.size > CHAT_PHOTO_MAX_SOURCE_BYTES
          ? t("chat.error.photoSize")
          : t("chat.error.photoFormat"),
      );
      return;
    }

    setSending(true);
    setError(null);
    setErrorUpgrade(false);
    setQuotaWarning(null);
    stickToBottomRef.current = true;
    setShowJumpToLatest(false);
    onCoachTyping?.(true);

    const caption = options?.note?.trim() ?? "";
    const photoUserId = options?.existingUserMsgId ?? newPersistedMessageId();
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
          enter: true,
          fresh: true,
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
          photoPreviewUrl: options?.previewUrl,
          enter: true,
          fresh: true,
        },
        {
          id: coachPlaceholderId,
          from: "coach",
          text: "",
          time: formatMessageTime(undefined, lang),
          streaming: true,
          enter: true,
          fresh: true,
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

    try {
      const prepared = await prepareChatPhoto(file);
      const analysis = await apiPost<
        | {
            quotaExceeded: true;
            resource: "maya_photo" | "leo_photo" | "text_tokens";
          }
            | {
            summary: string;
            messageId: string | null;
            userMessageId?: string | null;
            analysis: unknown;
            confirmation?: {
              pendingId: string;
              summary: string;
              content: string;
              messageId: string;
            } | null;
          }
      >(`/api/chat/${coachId}/analyze`, {
        imageBase64: prepared.base64,
        mimeType: prepared.mimeType,
        locale: lang,
        ...(caption ? { note: caption.slice(0, 500) } : {}),
        ...(PERSISTED_ID_RE.test(photoUserId)
          ? { clientMessageId: photoUserId }
          : {}),
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
      const persistedPhotoUserId =
        typeof analysis.userMessageId === "string" && analysis.userMessageId.length > 0
          ? analysis.userMessageId
          : photoUserId;
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
                ? { ...msg, id: persistedPhotoUserId, photoRetry: undefined }
                : msg,
          ),
          persistedPhotoUserId,
        ),
      );
    } catch (err) {
      if (err instanceof ChatPhotoError) {
        const text =
          err.code === "too_large"
            ? t("chat.error.photoSize")
            : t("chat.error.photoFormat");
        setError(text);
        failPhotoMessage();
      } else {
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
          const text = photoAnalysisFailureText(err, t);
          setErrorUpgrade(false);
          setMessages((prev) =>
            markMessageFailed(
              prev.map((msg) =>
                msg.id === coachPlaceholderId
                  ? { ...msg, text, streaming: false }
                  : msg,
              ),
              photoUserId,
            ),
          );
        }
      }
    } finally {
      clearTyping();
    }
  };

  const attachPhotoToComposer = (file: File) => {
    if (!canAttachChatPhoto(file)) {
      setError(
        file.size > CHAT_PHOTO_MAX_SOURCE_BYTES
          ? t("chat.error.photoSize")
          : t("chat.error.photoFormat"),
      );
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
  const visibleMessages = messages.slice(-MESSAGE_RENDER_WINDOW);
  const pinned = useMemo(
    () => findLatestPinnableMessage(coachId, messages),
    [coachId, messages],
  );
  const pinnedId = pinned?.id ?? null;
  const pinnedFresh = Boolean(pinned?.fresh);
  // A plan/score that just arrived is not repeated in the thread, so show it.
  useEffect(() => {
    if (pinnedId && pinnedFresh) setPinOpen(true);
  }, [pinnedId, pinnedFresh]);

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
      <ImagePickerModal
        isOpen={imagePickerOpen}
        onClose={() => setImagePickerOpen(false)}
        onImageSelect={handlePhoto}
      />
      {pinned ? (
        <ChatPinnedBanner
          label={
            coachId === "leo" ? t("chat.pin.analysis") : t("chat.pin.program")
          }
          title={
            coachId === "leo" ? t("analysis.score") : t("workout.weekly_title")
          }
          metric={pinnedCardMetric(coachId, pinned)}
          primary={primary}
          primaryLight={primaryLight}
          ring={ring}
          expanded={pinOpen}
          onToggle={() => setPinOpen((open) => !open)}
        >
          <ChatRichCard
            contactId={coachId}
            messageType={
              pinned.messageType ?? (coachId === "leo" ? "score" : "workout_plan")
            }
            payload={pinned.payload ?? {}}
            fallbackText={pinned.text}
          />
        </ChatPinnedBanner>
      ) : null}
      <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={listRef}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-4"
        data-chat-scroller
      >
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
            actionHref={errorUpgrade ? "/myaccount" : undefined}
            actionLabel={errorUpgrade ? t("usage.upgrade") : undefined}
            onDismiss={() => {
              setError(null);
              setErrorUpgrade(false);
            }}
          />
        )}
        {!loadingHistory && messages.length === 0 && !error && (
          <>
            <EmptyState
              title={t("chat.empty.title")}
              subtitle={t("chat.empty.subtitle")}
              icon={<MessageCircle className="h-5 w-5" aria-hidden />}
              tone="info"
            />
            <CoachStarterChips
              coachId={coachId}
              onPick={(text) => void sendTextMessage(text)}
            />
          </>
        )}
        <div
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-label={t("chat.a11y.log")}
        >
          <div role="list" ref={threadRef} className="flex flex-col">
            {visibleMessages.map((msg, index) => {
              const isCoach = msg.from === "coach";
              const side = isCoach ? "coach" : "user";
              const isTyping = isCoach && msg.streaming && msg.text === "";
              const isStreamingText = isCoach && msg.streaming && msg.text !== "";
              const isFailed = msg.status === "failed";
              const group = chatGroupPosition(visibleMessages, index);
              const authorLabel = isCoach ? contact.name : youLabel;
              const bubbleAriaLabel = isFailed
                ? `${authorLabel}: ${msg.text}. ${t("chat.message.failed")}`
                : `${authorLabel}: ${msg.text}`;

              const canSelect = canSelectForDelete(msg);
              const selected = selectedIds.has(msg.id);
              const showMenu = !selectingDelete && canSelect;
              // The photo has its own entrance; stacking both reads as overlap.
              const enterMotion = Boolean(msg.enter) && !msg.photoPreviewUrl;

              return (
                <div
                  key={msg.id}
                  role="listitem"
                  className={`flex items-end gap-2 ${isCoach ? "justify-start" : "justify-end"} ${
                    index === 0 ? "" : group.first ? "mt-3" : "mt-1"
                  }`}
                  onClick={
                    selectingDelete && canSelect
                      ? () => toggleDeleteSelect(msg.id)
                      : undefined
                  }
                >
                  {selectingDelete && canSelect && (
                    <span
                      aria-hidden
                      className={`mb-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        selected
                          ? "border-emerald-400 bg-emerald-500 text-white"
                          : "border-zinc-500 bg-transparent"
                      }`}
                    >
                      {selected ? <Check className="h-3 w-3" /> : null}
                    </span>
                  )}
                  {isCoach && (
                    <ChatAvatarSlot>
                      {group.last ? (
                        <CoachChatAvatar src={publicAssetUrl(coachAvatar)} />
                      ) : null}
                    </ChatAvatarSlot>
                  )}
                  <div
                    className={`flex min-w-0 max-w-[min(78%,22rem)] flex-col ${
                      isCoach ? "items-start" : "items-end"
                    }`}
                  >
                      <>
                        <div
                          className={`${chatBubbleEnterClass(side, enterMotion)} relative px-3.5 py-2.5 text-sm leading-relaxed ${
                            isTyping ? "min-h-[2.75rem]" : ""
                          } ${
                            isFailed ? "chat-bubble-shake opacity-80 ring-1 ring-red-400/50" : ""
                          }`}
                          onAnimationEnd={(event) => {
                            if (!msg.enter) return;
                            if (!event.animationName.startsWith("message-in")) return;
                            setMessages((prev) =>
                              prev.map((row) =>
                                row.id === msg.id ? { ...row, enter: false } : row,
                              ),
                            );
                          }}
                          aria-label={isTyping ? undefined : bubbleAriaLabel}
                          aria-busy={isTyping || isStreamingText || undefined}
                          aria-invalid={isFailed || undefined}
                          style={
                            isCoach
                              ? {
                                  borderRadius: chatBubbleRadius(side, group.last),
                                  backgroundColor: `${primary}18`,
                                  border: `1px solid ${ring}`,
                                  color: "#fff",
                                  boxShadow: `0 8px 22px rgba(0,0,0,0.18), 0 0 10px ${ring}`,
                                }
                              : {
                                  borderRadius: chatBubbleRadius(side, group.last),
                                  background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                                  color: "#fff",
                                  boxShadow: `0 8px 22px ${shadow}`,
                                  ...(isFailed
                                    ? { border: "1px solid rgba(248,113,113,0.55)" }
                                    : {}),
                                }
                          }
                        >
                          {isTyping ? (
                            <span className="flex items-center gap-2 py-0.5">
                              <span className="typing-dot" style={{ backgroundColor: primaryLight }} aria-hidden />
                              <span className="typing-dot" style={{ backgroundColor: primaryLight }} aria-hidden />
                              <span className="typing-dot" style={{ backgroundColor: primaryLight }} aria-hidden />
                              <span className="text-xs text-zinc-300">
                                {t("chat.thinking")}
                              </span>
                            </span>
                          ) : (
                          <>
                          {msg.photoPreviewUrl ? (
                            <div className="chat-photo-in mb-2 aspect-[4/3] w-56 max-w-full overflow-hidden rounded-xl bg-black/25">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={msg.photoPreviewUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : null}
                          <ChatMessageText
                            text={msg.text}
                            streaming={isStreamingText}
                            typeIn={isCoach && Boolean(msg.fresh)}
                          />
                          <div className="mt-1 flex items-center gap-1.5">
                            <p className="chat-message-time inline-flex items-center opacity-60">
                              {msg.time}
                              {!isCoach ? <ChatDeliveryTicks status={msg.status} /> : null}
                            </p>
                            {showMenu ? (
                              <MessageOverflowMenu
                                open={openMenuId === msg.id}
                                menuRef={openMenuId === msg.id ? openMenuRef : undefined}
                                label={t("chat.message.menu")}
                                deleteLabel={t("chat.delete.action")}
                                deleting={deleting}
                                align={isCoach ? "start" : "end"}
                                onToggle={() =>
                                  setOpenMenuId((current) =>
                                    current === msg.id ? null : msg.id,
                                  )
                                }
                                onDelete={() => enterDeleteSelect(msg)}
                              />
                            ) : null}
                          </div>
                          </>
                          )}
                          {isCoach && !msg.streaming && msg.id && !String(msg.id).startsWith("local-") ? (
                            <button
                              type="button"
                              className="mt-1 text-[10px] font-medium text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline"
                              onClick={() => void reportCoachMessage(msg.id, msg.text)}
                            >
                              {t("chat.message.report")}
                            </button>
                          ) : null}
                        </div>
                        {isTyping ? (
                          <p className="sr-only" aria-live="polite">
                            {t("chat.a11y.typing", { name: contact.name })}
                          </p>
                        ) : null}
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
                              (msg.payload as {
                                confirmation: {
                                  pendingId: string;
                                  summary: string;
                                  status?: "pending" | "confirmed" | "rejected";
                                };
                              }).confirmation
                            }
                            onResolved={(status) => {
                              setMessages((prev) =>
                                prev.map((item) => {
                                  if (item.id !== msg.id || !item.payload || typeof item.payload !== "object") {
                                    return item;
                                  }
                                  const payload = item.payload as {
                                    confirmation?: Record<string, unknown>;
                                  };
                                  return {
                                    ...item,
                                    payload: {
                                      ...payload,
                                      saved: status === "confirmed",
                                      confirmation: {
                                        ...(payload.confirmation ?? {}),
                                        status,
                                      },
                                    },
                                  };
                                }),
                              );
                              void refreshHome();
                            }}
                          />
                        ) : null}
                        {isCoach && !msg.streaming && msg.id !== pinnedId ? (
                          <ChatRichCard
                            contactId={coachId}
                            messageType={msg.messageType ?? "text"}
                            payload={msg.payload ?? {}}
                            fallbackText={msg.text}
                          />
                        ) : null}
                      </>
                  </div>
                  {!isCoach && (
                    <ChatAvatarSlot>
                      {group.last ? (
                        <UserChatAvatar
                          src={userAvatar ? publicAssetUrl(userAvatar) : null}
                          name={userName}
                        />
                      ) : null}
                    </ChatAvatarSlot>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {showJumpToLatest ? (
        <button
          type="button"
          onClick={() => scrollToLatest(true)}
          className="chat-jump-latest absolute bottom-3 left-1/2 z-10 flex min-h-9 -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/15 bg-zinc-900/95 px-3.5 text-xs font-semibold text-white shadow-lg"
        >
          <ArrowDown className="h-3.5 w-3.5" aria-hidden />
          {t("chat.jump_latest")}
        </button>
      ) : null}
      </div>

      {selectingDelete ? (
        <div className="shrink-0 border-t border-white/[0.07] bg-[#0a0812]/95 px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <p className="mb-2 text-center text-xs text-zinc-400">
            {t("chat.delete.selectHint")}
          </p>
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={cancelDeleteSelect}
              disabled={deleting}
              className="rounded-full px-4 py-2 text-sm text-zinc-300 hover:bg-white/5 disabled:opacity-50"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={() => void handleDeleteSelected()}
              disabled={deleting || selectedIds.size === 0}
              className="rounded-full bg-red-500/90 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {deleting
                ? t("common.loading")
                : t("chat.delete.deleteCount", { count: selectedIds.size })}
            </button>
          </div>
        </div>
      ) : (
      <>
      {queueNotice ? (
        <p className="px-4 py-2 text-center text-xs text-amber-200">
          {t("chat.queued")}
        </p>
      ) : null}
      <ChatComposer
        input={input}
        onInputChange={setInput}
        onSend={() => void handleSend()}
        sending={sending}
        showCamera={VISION_COACHES.has(coachId)}
        onCameraClick={() => setImagePickerOpen(true)}
        onVoiceError={setError}
        attachmentPreviewUrl={composerPhoto?.url ?? null}
        onRemoveAttachment={() => setComposerPhoto(null)}
        accentColor={primary}
      />
      </>
      )}
    </div>
  );
}
