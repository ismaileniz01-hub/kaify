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

export default function ChatPage() {
  const params = useParams();
  const id = params.id as string;
  const contact = getContact(id);

  if (!contact) {
    notFound();
  }

  const contactId = contact.id as ContactId;
  const [avatarState, setAvatarState] = useState<"idle" | "typing" | "sent">("idle");
  const [showImagePicker, setShowImagePicker] = useState(false);
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


  return (
    <div className={`phone-shell chat-gradient ${patternClass} relative flex flex-col`}>

      <header className="relative z-20 flex items-center gap-3 px-4 pb-2 pt-16">
        <Link
          href="/messages"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Geri"
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
            <span className="text-sm font-semibold text-white">
              {contact.name}
            </span>
            <span className="flex items-center gap-1 text-xs text-purple-400">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
              {contact.role}
            </span>
          </div>
        </div>
        <div className="h-9 w-9" />
        <div className="absolute bottom-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-purple-400/30 to-transparent" />
      </header>

      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <ChatBubbles contactId={contactId} onTypingChange={handleTypingChange} onUserTyping={handleUserTyping} onConversationEnd={handleConversationEnd} />
      </div>

      <div className="pointer-events-none absolute bottom-32 left-3 z-20">
        <ContactAvatar
          src={
            contactId === "alex" && avatarState === "typing" ? "/avatars/alex 1.png" :
            contactId === "alex" && avatarState === "sent" ? "/avatars/alex 2.png" :
            contactId === "maya" && avatarState === "typing" ? "/avatars/dr maya 1.png" :
            contactId === "maya" && avatarState === "sent" ? "/avatars/dr maya 2.png" :
            contactId === "leo" && avatarState === "typing" ? "/avatars/Leo 1.png" :
            contactId === "leo" && avatarState === "sent" ? "/avatars/Leo 2.png" :
            contactId === "kai" ? kaiAvatar :
            contact.avatar
          }
          alt={contact.name}
          size="xl"
          pulse={false}
          effect={getEffect()}
          auraColor={contactId === "kai" ? auraColor : "default"}
        />
      </div>

      <footer className="relative z-30 px-3 pb-8 pt-2">
        <div className="glass-input flex items-center gap-2 rounded-full px-2 py-2">
          {contactId !== "kai" && contactId !== "alex" && (
            <button
              type="button"
              onClick={() => setShowImagePicker(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/5 hover:text-purple-400"
              aria-label="Fotoğraf ekle"
            >
              <Camera className="h-5 w-5" />
            </button>
          )}
          <input
            type="text"
            placeholder="Mesajını yaz..."
            readOnly
            className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
          />
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/5 hover:text-purple-400"
            aria-label="Sesli mesaj"
          >
            <Mic className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-500 text-white shadow-md shadow-purple-500/40 transition active:scale-95"
            aria-label="Gönder"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </footer>

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
