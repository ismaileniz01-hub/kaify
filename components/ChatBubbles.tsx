"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { ContactId } from "@/lib/contacts";
import { CHAT_THREADS, CONTACTS } from "@/lib/contacts";
import { useKai } from "@/lib/kai-context";
import { useSound } from "@/lib/use-sound";
import { DEMO_USER_PROFILE } from "@/lib/user";
import { useLang } from "@/lib/lang-context";

type ChatBubblesProps = {
  contactId: ContactId;
  onTypingChange?: (isTyping: boolean) => void;
  onUserTyping?: (isTyping: boolean) => void;
  onConversationEnd?: () => void;
  /** Kullanıcının gönderdiği mesajlar */
  userMessages?: { text: string; time: string }[];
};

type MessageItem = {
  id: number;
  text: string;
  from: "user" | "contact";
  time: string;
  visible: boolean;
};

export function ChatBubbles({ contactId, onTypingChange, onUserTyping, onConversationEnd, userMessages = [] }: ChatBubblesProps) {
  const { t } = useLang();

  const contact = CONTACTS[contactId];
  const messages = CHAT_THREADS[contactId];
  const onConversationEndRef = useRef(onConversationEnd);
  onConversationEndRef.current = onConversationEnd;

  // Kai için unlock edilmiş level'a göre avatar
  const { avatar: kaiAvatar } = useKai();
  const contactAvatar = contactId === "kai" ? kaiAvatar : contact.avatar;

  const { play } = useSound();
  const [allMessages, setAllMessages] = useState<MessageItem[]>([]);
  const [typingId, setTypingId] = useState<number | null>(null);
  const prevVisibleCountRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const nextIdRef = useRef(1000);

  // İlk yüklemede koçun mesajlarını sırayla göster (sadece contact mesajları)
  useEffect(() => {
    const contactMessages = messages.filter((msg) => msg.from === "contact");
    const initial: MessageItem[] = contactMessages.map((msg) => ({
      ...msg,
      visible: false,
    }));

    setAllMessages(initial);
    setTypingId(null);

    let delay = 0;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    initial.forEach((msg) => {
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
        setAllMessages((prev) =>
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  // Yeni görünür olan mesajları tespit et ve ses çal
  useEffect(() => {
    const visibleCount = allMessages.filter((s) => s.visible).length;
    if (visibleCount > prevVisibleCountRef.current) {
      const newlyVisible = allMessages.filter((s) => s.visible);
      const lastVisible = newlyVisible[newlyVisible.length - 1];
      if (lastVisible) {
        if (lastVisible.from === "contact") {
          play("receive");
        } else {
          play("send");
        }
      }
    }
    prevVisibleCountRef.current = visibleCount;
  }, [allMessages, play]);

  // typingId değiştiğinde dışarıya bildir
  useEffect(() => {
    if (typingId !== null) {
      const msg = allMessages.find(m => m.id === typingId);
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
  }, [typingId, allMessages, onTypingChange, onUserTyping]);

  // Kullanıcı mesajı gönderildiğinde hemen ekle ve koç cevap versin
  const lastUserMsgCount = useRef(0);
  useEffect(() => {
    if (userMessages.length > lastUserMsgCount.current) {
      // Yeni kullanıcı mesajı geldi - hemen allMessages'a ekle
      const newUserMsg = userMessages[userMessages.length - 1];
      const userMsgId = nextIdRef.current++;
      lastUserMsgCount.current = userMessages.length;

      setAllMessages((prev) => [
        ...prev,
        { id: userMsgId, text: newUserMsg.text, from: "user", time: newUserMsg.time, visible: true },
      ]);

      // Koç cevap versin
      const contactReplies = messages.filter((msg) => msg.from === "contact");
      const replyIndex = userMessages.length - 1;
      if (replyIndex < contactReplies.length) {
        const reply = contactReplies[replyIndex];
        const replyId = nextIdRef.current++;

        // Yazıyor animasyonu
        const typingTimeout = setTimeout(() => {
          setTypingId(replyId);
        }, 300 + Math.random() * 400);

        // Cevap mesajı
        const msgTimeout = setTimeout(() => {
          setTypingId(null);
          setAllMessages((prev) => [
            ...prev,
            { id: replyId, text: reply.text, from: "contact", time: reply.time, visible: true },
          ]);
        }, 1000 + Math.random() * 800);

        return () => {
          clearTimeout(typingTimeout);
          clearTimeout(msgTimeout);
        };
      }
    }
  }, [userMessages, messages]);

  // Otomatik scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages, typingId]);

  const { primary, primaryLight, secondary, ring, shadow } = contact.color;

  return (
    <div className="flex flex-1 flex-col justify-end overflow-y-auto px-4 pb-36 pt-4">
      <div className="flex flex-col gap-3">
        {/* Tüm mesajlar kronolojik sırayla */}
        {allMessages.map((msg) => (
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
                </div>
              ) : (
                <div className="flex max-w-[82%] flex-col items-end gap-1 self-end">
                  <div className="flex items-end gap-2">
                    <div
                      className="flex items-center gap-1.5 px-5 py-3.5"
                      style={{
                        background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                        borderRadius: "18px 18px 4px 18px",
                        boxShadow: `0 4px 15px ${shadow}`,
                      }}
                    >
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
                    <div
                      className="animate-message px-4 py-2.5 text-sm leading-relaxed text-white"
                      style={{
                        backgroundColor: `${primary}18`,
                        borderRadius: "18px 18px 18px 4px",
                        boxShadow: `0 0 15px ${ring}`,
                        border: `1px solid ${ring}`,
                      }}
                    >
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
                      <div
                        className="animate-message px-4 py-2.5 text-sm leading-relaxed text-white"
                        style={{
                          background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                          borderRadius: "18px 18px 4px 18px",
                          boxShadow: `0 4px 15px ${shadow}`,
                        }}
                      >
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

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
