"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { ContactId } from "@/lib/contacts";
import { CHAT_THREADS, CONTACTS } from "@/lib/contacts";
import { useKai } from "@/lib/kai-context";
import { useSound } from "@/lib/use-sound";
import { DEMO_USER_PROFILE } from "@/lib/user";

type ChatBubblesProps = {
  contactId: ContactId;
  onTypingChange?: (isTyping: boolean) => void;
  onUserTyping?: (isTyping: boolean) => void;
  onConversationEnd?: () => void;
};

type MessageState = {
  id: number;
  text: string;
  from: "user" | "contact";
  time: string;
  visible: boolean;
};

export function ChatBubbles({ contactId, onTypingChange, onUserTyping, onConversationEnd }: ChatBubblesProps) {

  const contact = CONTACTS[contactId];
  const messages = CHAT_THREADS[contactId];
  const onConversationEndRef = useRef(onConversationEnd);
  onConversationEndRef.current = onConversationEnd;

  // Kai için unlock edilmiş level'a göre avatar
  const { avatar: kaiAvatar } = useKai();
  const contactAvatar = contactId === "kai" ? kaiAvatar : contact.avatar;

  const { play } = useSound();
  const [states, setStates] = useState<MessageState[]>([]);
  const [typingId, setTypingId] = useState<number | null>(null);
  const prevVisibleCountRef = useRef(0);

  useEffect(() => {
    const newStates: MessageState[] = messages.map((msg) => ({
      ...msg,
      visible: false,
    }));

    setStates(newStates);
    setTypingId(null);

    let delay = 0;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    newStates.forEach((msg) => {
      // Önce yazıyor animasyonu
      delay += 500 + Math.random() * 400;
      const typingTimeout = setTimeout(() => {
        setTypingId(msg.id);
      }, delay);
      timeouts.push(typingTimeout);

      // Sonra mesaj gelir
      delay += 700 + Math.random() * 500;
      const msgTimeout = setTimeout(() => {
        setTypingId(null);
        setStates((prev) =>
          prev.map((s) => (s.id === msg.id ? { ...s, visible: true } : s)),
        );
      }, delay);
      timeouts.push(msgTimeout);
    });

    // Son mesaj göründükten 1 saniye sonra konuşma bitti sinyali
    const endTimeout = setTimeout(() => {
      onConversationEndRef.current?.();
    }, delay + 1000);
    timeouts.push(endTimeout);

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [contactId, messages]);

  // Yeni görünür olan mesajları tespit et ve ses çal
  useEffect(() => {
    const visibleCount = states.filter((s) => s.visible).length;
    if (visibleCount > prevVisibleCountRef.current) {
      // Yeni görünür olan mesaj
      const newlyVisible = states.filter((s) => s.visible);
      const lastVisible = newlyVisible[newlyVisible.length - 1];
      if (lastVisible) {
        if (lastVisible.from === "contact") {
          play("receive"); // gelen mesaj sesi
        } else {
          play("send"); // giden mesaj sesi
        }
      }
    }
    prevVisibleCountRef.current = visibleCount;
  }, [states, play]);

  // typingId değiştiğinde dışarıya bildir
  useEffect(() => {
    if (typingId !== null) {
      const msg = states.find(m => m.id === typingId);
      if (msg?.from === "contact") {
        onTypingChange?.(true);
        onUserTyping?.(false);
      } else {
        onTypingChange?.(false);
        onUserTyping?.(true);
      }
    } else {
      onTypingChange?.(false);
      onUserTyping?.(false);
    }
  }, [typingId, states, onTypingChange, onUserTyping]);

  return (


    <div className="flex flex-1 flex-col justify-end overflow-y-auto px-4 pb-36 pt-4">
      <div className="flex flex-col gap-3">
        {states.map((msg) => (
          <div key={msg.id}>
            {/* Yazıyor animasyonu */}
            {typingId === msg.id && (
              msg.from === "contact" ? (
                <div className="flex max-w-[82%] items-end gap-2">
                  <div className="relative h-8 w-8 shrink-0">
                    <Image
                      src={contactId === "leo" ? "/avatars/leo-1.png" : contactAvatar}
                      alt={contact.name}
                      width={32}
                      height={32}
                      className="h-full w-full object-contain [image-rendering:pixelated]"
                      style={{ filter: "brightness(1.05) contrast(1.1)" }}
                    />
                  </div>
                  <div className="bubble-kai flex items-center gap-1.5 bg-zinc-900/90 px-5 py-3.5 ring-1 ring-white/5">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
              ) : (
                <div className="flex max-w-[82%] flex-col items-end gap-1 self-end">
                  <div className="flex items-end gap-2">
                    <div className="bubble-user flex items-center gap-1.5 bg-gradient-to-br from-purple-500 to-violet-600 px-5 py-3.5 shadow-md shadow-purple-900/30">
                      <span className="typing-dot typing-dot--user" />
                      <span className="typing-dot typing-dot--user" />
                      <span className="typing-dot typing-dot--user" />
                    </div>
                    <div className="relative h-8 w-8 shrink-0">
                      <Image
                        src={DEMO_USER_PROFILE.avatar}
                        alt={DEMO_USER_PROFILE.name}
                        width={32}
                        height={32}
                        className="h-full w-full rounded-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              )
            )}

            {/* Mesaj içeriği */}
            {msg.visible && (
              msg.from === "contact" ? (
                <div className="flex max-w-[82%] items-end gap-2">
                  <div className="relative h-8 w-8 shrink-0">
                    <Image
                      src={contactAvatar}
                      alt={contact.name}
                      width={32}
                      height={32}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="bubble-kai animate-message bg-zinc-900/90 px-4 py-2.5 text-sm leading-relaxed text-zinc-100 ring-1 ring-white/5">
                      {msg.text}
                    </div>
                    <span className="pl-1 text-[10px] text-zinc-600">
                      {msg.time}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="ml-auto flex max-w-[82%] flex-col items-end gap-1">
                  <div className="flex items-end gap-2">
                    <div className="flex flex-col items-end gap-1">
                      <div className="bubble-user animate-message bg-gradient-to-br from-purple-500 to-violet-600 px-4 py-2.5 text-sm leading-relaxed text-white shadow-md shadow-purple-900/30">
                        {msg.text}
                      </div>
                      <span className="pr-1 text-[10px] text-zinc-600">
                        {msg.time}
                      </span>
                    </div>
                    <div className="relative h-8 w-8 shrink-0">
                      <Image
                        src={DEMO_USER_PROFILE.avatar}
                        alt={DEMO_USER_PROFILE.name}
                        width={32}
                        height={32}
                        className="h-full w-full rounded-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              )



            )}
          </div>
        ))}
      </div>
    </div>
  );
}
