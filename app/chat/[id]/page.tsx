"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";

import { ArrowLeft, Camera, Mic, Send } from "lucide-react";
import { useState, useRef } from "react";
import { ChatBubbles } from "@/components/ChatBubbles";
import { ContactAvatar } from "@/components/ContactAvatar";
import { ImagePickerModal } from "@/components/ImagePickerModal";
import { getContact, type ContactId } from "@/lib/contacts";
import { useKai } from "@/lib/kai-context";
import { useLang } from "@/lib/lang-context";
import { useSession } from "@/lib/session-context";
import { LiveChatPanel } from "@/components/chat/LiveChatPanel";

export default function ChatPage() {
  const { t } = useLang();
  const { isAuthenticated } = useSession();
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
    if (contactId !== "kai" || auraColor === "default") return "none" as const;
    if (auraColor === "electric") return "electric" as const;
    return "fire" as const;
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
    <div className={`phone-shell chat-gradient ${patternClass} relative flex flex-col`}>

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
        {isAuthenticated ? (
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
            <footer className="relative z-30 px-3 pb-8 pt-2">
              <div className="glass-input flex items-center gap-2 rounded-full px-2 py-2">
                {contactId !== "kai" && contactId !== "alex" && (
                  <button
                    type="button"
                    onClick={() => setShowImagePicker(true)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/5 hover:text-purple-400"
                    aria-label={t("chat.aria.photo")}
                  >
                    <Camera className="h-5 w-5" />
                  </button>
                )}
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder={t("chat.placeholder.chat")}
                  className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
                />
                <button
                  type="button"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/5 hover:text-purple-400"
                  aria-label={t("chat.aria.voice")}
                >
                  <Mic className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-500 text-white shadow-md shadow-purple-500/40 transition active:scale-95 disabled:opacity-40"
                  aria-label={t("chat.aria.send")}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </footer>
          </>
        )}
      </div>

      {!isAuthenticated && (
        <div className="pointer-events-none absolute bottom-32 left-3 z-20">
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
