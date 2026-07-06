"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";

import { ArrowLeft } from "lucide-react";
import { useState, useRef } from "react";
import { ChatBubbles } from "@/components/ChatBubbles";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ContactAvatar } from "@/components/ContactAvatar";
import { ImagePickerModal } from "@/components/ImagePickerModal";
import { getContact, type ContactId } from "@/lib/contacts";
import { resolveAvatarEffect } from "@/lib/aura-effects";
import { useKai } from "@/lib/kai-context";
import { useLang } from "@/lib/lang-context";
import { useSession } from "@/lib/session-context";
import { LiveChatPanel } from "@/components/chat/LiveChatPanel";

export default function ChatPage() {
  const { t } = useLang();
  const { isAuthenticated, isLoading: sessionLoading } = useSession();
  const params = useParams();
  const id = params.id as string;
  const contact = getContact(id);

  if (!contact) {
    notFound();
  }

  const contactId = contact.id as ContactId;
  const [avatarState, setAvatarState] = useState<"idle" | "typing" | "sent">("idle");
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [userMessages, setUserMessages] = useState<{ text: string; time: string }[]>([]);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const patternClass = `chat-pattern chat-pattern--${contactId}`;

  // Kai için unlock edilmiş level'a göre avatar ve aura rengi
  const { avatar: kaiAvatar, auraColor } = useKai();

  const getAvatarSrc = () => {
    if (contactId === "alex") {
      switch (avatarState) {
        case "typing": return "/avatars/alex-typing.png";
        case "sent": return "/avatars/alex-sent.png";
        default: return contact.avatar;
      }
    }
    if (contactId === "leo") {
      switch (avatarState) {
        case "typing": return "/avatars/leo-1.png";
        case "sent": return "/avatars/leo-2.png";
        default: return contact.avatar;
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
    const time = new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    setUserMessages((prev) => [...prev, { text: inputValue.trim(), time }]);
    setInputValue("");
  };

  const { primary, primaryLight, secondary, text: coachText, ring, shadow } = contact.color;

  return (
    <div className={`phone-shell chat-gradient ${patternClass} relative flex h-[100dvh] flex-col`}>

      <header className="relative z-20 flex items-center gap-3 px-4 pb-2 pt-16">
        <Link
          href="/messages"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          aria-label={t("nav.back")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex flex-1 items-center justify-center gap-2">
          <ContactAvatar
            src={getAvatarSrc()}
            alt={contact.name}
            size="xs"
            effect={getEffect()}
            auraColor={contactId === "kai" ? auraColor : "default"}
          />
          <div className="flex flex-col items-start">
            <span className="text-sm font-semibold" style={{ color: primaryLight }}>
              {contact.name}
            </span>
            <span className="flex items-center gap-1 text-xs" style={{ color: primaryLight }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: primary }} />
              {contact.role}
            </span>
          </div>
        </div>
        <div className="h-9 w-9" />
        <div
          className="absolute bottom-0 left-3 right-3 h-px"
          style={{
            background: `linear-gradient(to right, transparent, ${primary}60, transparent)`,
          }}
        />
      </header>

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
            <div className="flex-1 overflow-y-auto">
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
              onCameraClick={() => setShowImagePicker(true)}
              compactSend
            />
          </>
        )}
      </div>

      {!sessionLoading && !isAuthenticated && (
      <div className="pointer-events-none absolute bottom-32 -left-8 z-10">
        <ContactAvatar
          src={
            contactId === "alex" && avatarState === "typing"
              ? "/avatars/alex 1.png"
              : contactId === "alex" && avatarState === "sent"
                ? "/avatars/alex 2.png"
                : contactId === "maya" && avatarState === "typing"
                  ? "/avatars/dr maya 1.png"
                  : contactId === "maya" && avatarState === "sent"
                    ? "/avatars/dr maya 2.png"
                    : contactId === "leo" && avatarState === "typing"
                      ? "/avatars/leo-1.png"
                      : contactId === "leo" && avatarState === "sent"
                        ? "/avatars/leo-2.png"
                        : contactId === "kai"
                          ? kaiAvatar
                          : contact.avatar
          }
          alt={contact.name}
          size="xl"
          pulse={false}
          effect={getEffect()}
          auraColor={contactId === "kai" ? auraColor : "default"}
        />
      </div>
      )}

      <ImagePickerModal
        isOpen={showImagePicker}
        onClose={() => setShowImagePicker(false)}
        onImageSelect={(file) => {
          console.log("Fotoğraf seçildi:", file.name);
          setShowImagePicker(false);
        }}
      />
    </div>
  );
}
