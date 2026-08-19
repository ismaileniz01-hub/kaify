"use client";

import { notFound, useParams } from "next/navigation";

import { useEffect, useState, useRef } from "react";
import { ChatBubbles } from "@/components/ChatBubbles";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ContactAvatar } from "@/components/ContactAvatar";
import dynamic from "next/dynamic";
import { getContact, type ContactId } from "@/lib/contacts";
import { resolveAvatarEffect } from "@/lib/aura-effects";
import { useKai } from "@/lib/kai-context";
import { useLang } from "@/lib/lang-context";
import { useSession } from "@/lib/session-context";
import { AppHeader } from "@/components/navigation/AppHeader";
import { coachAvatarTransitionName } from "@/lib/motion/shared-element";

const LiveChatPanel = dynamic(
  () =>
    import("@/components/chat/LiveChatPanel").then((m) => m.LiveChatPanel),
  {
    ssr: false,
    loading: () => <ChatLoadingFallback />,
  },
);

function ChatLoadingFallback() {
  const { t } = useLang();
  return (
    <div className="flex flex-1 items-center justify-center text-xs type-muted">
      {t("chat.loading")}
    </div>
  );
}

const ImagePickerModal = dynamic(
  () =>
    import("@/components/ImagePickerModal").then((m) => m.ImagePickerModal),
  { ssr: false },
);

export default function ChatPage() {
  const { t, lang } = useLang();
  const { isAuthenticated, isLoading: sessionLoading } = useSession();
  const params = useParams();
  const id = params.id as string;
  const contact = getContact(id);

  const [avatarState, setAvatarState] = useState<"idle" | "typing" | "sent">("idle");
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [userMessages, setUserMessages] = useState<{ text: string; time: string }[]>([]);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Kai için unlock edilmiş level'a göre avatar ve aura rengi
  const { avatar: kaiAvatar, auraColor } = useKai();

  useEffect(() => {
    const lockViewport = () => {
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0);
      }
    };
    lockViewport();
    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", lockViewport);
    viewport?.addEventListener("scroll", lockViewport);
    window.addEventListener("scroll", lockViewport, { passive: true });
    return () => {
      viewport?.removeEventListener("resize", lockViewport);
      viewport?.removeEventListener("scroll", lockViewport);
      window.removeEventListener("scroll", lockViewport);
    };
  }, []);

  if (!contact) {
    notFound();
  }

  const contactId = contact.id as ContactId;
  const patternClass = `chat-pattern chat-pattern--${contactId}`;

  const formatGuestTime = () =>
    new Date().toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" });

  const getAvatarSrc = () => {
    if (contactId === "alex") {
      switch (avatarState) {
        case "typing":
          return "/avatars/alex-typing.png";
        case "sent":
          return "/avatars/alex-sent.png";
        default:
          return contact.avatar;
      }
    }
    if (contactId === "maya") {
      switch (avatarState) {
        case "typing":
          return "/avatars/dr maya 1.png";
        case "sent":
          return "/avatars/dr maya 2.png";
        default:
          return contact.avatar;
      }
    }
    if (contactId === "leo") {
      switch (avatarState) {
        case "typing":
          return "/avatars/leo-1.png";
        case "sent":
          return "/avatars/leo-2.png";
        default:
          return contact.avatar;
      }
    }
    if (contactId === "kai") {
      return kaiAvatar;
    }
    return contact.avatar;
  };

  // Contact yazarken -> typing, yazmayı bitirince -> sent
  const handleTypingChange = (typing: boolean) => {
    if (typing) {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      setAvatarState("typing");
    } else {
      setAvatarState("sent");
      // Kai için: sent olduktan 2 saniye sonra idle'a dön (efekt dursun)
      if (contactId === "kai") {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => {
          setAvatarState("idle");
        }, 2000);
      }
    }
  };

  // Kullanıcı (ben) yazarken -> alex 2
  const handleUserTyping = (typing: boolean) => {
    if (typing) {
      // Kullanıcı yazmaya başladı -> alex 2
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      setAvatarState("sent");
    }
  };

  // Aura rengine göre efekt tipini belirle
  const getEffect = () => {
    if (contactId !== "kai") return "none" as const;
    return resolveAvatarEffect(auraColor);
  };

  // Konuşma tamamen bittiğinde -> 1 saniye sonra normal avatar (efekt dursun)
  const handleConversationEnd = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setAvatarState("idle");
    }, 1000);
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;
    setUserMessages((prev) => [
      ...prev,
      { text: inputValue.trim(), time: formatGuestTime() },
    ]);
    setInputValue("");
  };

  return (
    <div className={`phone-shell chat-shell chat-gradient ${patternClass} relative flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden`}>

      <AppHeader
        backHref="/messages"
        backLabel={t("nav.back")}
        title={
          <span className="flex items-center justify-center gap-2">
            <ContactAvatar
              src={getAvatarSrc()}
              alt={contact.name}
              size="xs"
              effect={getEffect()}
              auraColor={contactId === "kai" ? auraColor : "default"}
              transitionName={coachAvatarTransitionName(contactId)}
              presence={avatarState}
              coachId={contactId}
            />
            <span className="flex flex-col items-start">
              <span className="font-semibold" style={{ color: contact.color.primaryLight }}>
                {contact.name}
              </span>
              <span className="flex items-center gap-1 text-xs font-normal" style={{ color: contact.color.primaryLight }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: contact.color.primary }} />
                {t(contact.roleKey as "contact.alex.role")}
              </span>
            </span>
          </span>
        }
        divider
      />

      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        {sessionLoading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6">
            <div className="h-10 w-full max-w-xs animate-pulse rounded-2xl bg-white/5" />
            <p className="text-xs text-zinc-500">{t("common.loading")}</p>
          </div>
        ) : isAuthenticated ? (
          <LiveChatPanel
            coachId={contactId}
            onCoachTyping={(typing) => {
              if (typing) {
                if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
                setAvatarState("typing");
              } else {
                setAvatarState("sent");
                if (contactId === "kai") {
                  idleTimerRef.current = setTimeout(() => setAvatarState("idle"), 2000);
                }
              }
            }}
          />
        ) : (
          <>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <ChatBubbles
                contactId={contactId}
                onTypingChange={handleTypingChange}
                onUserTyping={handleUserTyping}
                onConversationEnd={handleConversationEnd}
                userMessages={userMessages}
              />
            </div>
            <ChatComposer
              input={inputValue}
              onInputChange={setInputValue}
              onSend={handleSend}
              showCamera={contactId !== "kai" && contactId !== "alex"}
              onCameraClick={() => {
                if (!isAuthenticated) return;
                setShowImagePicker(true);
              }}
              compactSend
              accentColor={contact.color.primary}
            />
          </>
        )}
      </div>

      {/* Large coach presence — sits above the composer on the bottom-left. */}
      {!sessionLoading && (
      <div className="pointer-events-none absolute bottom-36 -left-8 z-[5]">
        <ContactAvatar
          src={getAvatarSrc()}
          alt={contact.name}
          size="xl"
          pulse={false}
          effect={getEffect()}
          auraColor={contactId === "kai" ? auraColor : "default"}
          presence={avatarState}
          coachId={contactId}
        />
      </div>
      )}

      <ImagePickerModal
        isOpen={showImagePicker}
        onClose={() => setShowImagePicker(false)}
        onImageSelect={() => {
          if (!isAuthenticated) return;
          setUserMessages((prev) => [
            ...prev,
            {
              text: t("chat.photo.sent"),
              time: formatGuestTime(),
            },
          ]);
          setShowImagePicker(false);
        }}
      />
    </div>
  );
}
