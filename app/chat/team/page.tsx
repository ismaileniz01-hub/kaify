"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { CONTACTS } from "@/lib/contacts";
import { useKai } from "@/lib/kai-context";
import { useLang } from "@/lib/lang-context";

type CoachId = "alex" | "maya" | "leo" | "kai";

type ChatMessage = {
  id: number;
  type: "coach" | "user";
  coachId?: CoachId;
  text: string;
  time: string;
};

const COACH_ORDER: CoachId[] = ["alex", "maya", "leo", "kai"];

const COACH_INTROS: Record<CoachId, string> = {
  alex: "Hey! 💪 Bugünkü antrenmanını kaçırmışsın, hadi telafi edelim!",
  maya: "Merhaba! 🥗 Öğün planını güncelledim, protein oranını yükselttim.",
  leo: "Selam! 📋 Vücut duruş analizinin sonuçları geldi, omuz mobilitesi üzerinde çalışmalısın.",
  kai: "Herkese merhaba! 👋 Ben Kai, takım arkadaşınız. Bugün hep birlikte harika bir gün geçireceğiz!",
};

const COACH_COLORS: Record<CoachId, string> = {
  alex: "from-red-500/20 to-red-600/10 border-red-500/30",
  maya: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
  leo: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
  kai: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
};

const COACH_NAMES: Record<CoachId, string> = {
  alex: "Alex",
  maya: "Dr. Maya",
  leo: "Leo",
  kai: "Kai",
};

const COACH_REPLIES: Record<CoachId, string[]> = {
  alex: ["Harika! Hadi başlayalım 💪", "Bugün bacak günü mü?", "Mükemmel, devam et!"],
  maya: ["Protein alımını unutma 🥗", "Bol su içmeyi ihmal etme", "Harika bir seçim!"],
  leo: ["Duruşuna dikkat et 📋", "Omuzlarını geri çek", "Mükemmel ilerleme!"],
  kai: ["Hep birlikte başaracağız! 🌟", "Seninle gurur duyuyorum!", "Harika gidiyorsun, devam et!"],
};

export default function TeamChatPage() {
  const { t } = useLang();
  const { avatar: kaiAvatar } = useKai();
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);
  const [typingCoach, setTypingCoach] = useState<CoachId | null>(null);
  const [userInput, setUserInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextIdRef = useRef(100);

  // Koçların ilk mesajlarını sırayla göster
  useEffect(() => {
    let delay = 0;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    COACH_ORDER.forEach((coachId, index) => {
      // Yazıyor animasyonu
      delay += 600 + Math.random() * 400;
      const typingTimeout = setTimeout(() => {
        setTypingCoach(coachId);
      }, delay);
      timeouts.push(typingTimeout);

      // Mesaj gelir
      delay += 800 + Math.random() * 500;
      const msgTimeout = setTimeout(() => {
        setTypingCoach(null);
        const id = nextIdRef.current++;
        setAllMessages((prev) => [
          ...prev,
          {
            id,
            type: "coach",
            coachId,
            text: COACH_INTROS[coachId],
            time: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }, delay);
      timeouts.push(msgTimeout);
    });

    return () => timeouts.forEach(clearTimeout);
  }, []);

  // Otomatik scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages, typingCoach]);

  const handleSend = () => {
    if (!userInput.trim()) return;
    const time = new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    const userMsgId = nextIdRef.current++;

    // Kullanıcı mesajını ekle
    setAllMessages((prev) => [
      ...prev,
      { id: userMsgId, type: "user", text: userInput.trim(), time },
    ]);
    setUserInput("");

    // Koçlardan biri cevap versin
    setTimeout(() => {
      const randomCoach = COACH_ORDER[Math.floor(Math.random() * COACH_ORDER.length)];
      setTypingCoach(randomCoach);

      setTimeout(() => {
        setTypingCoach(null);
        const replyId = nextIdRef.current++;
        const replies = COACH_REPLIES[randomCoach];
        const reply = replies[Math.floor(Math.random() * replies.length)];

        setAllMessages((prev) => [
          ...prev,
          {
            id: replyId,
            type: "coach",
            coachId: randomCoach,
            text: reply,
            time: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }, 1000 + Math.random() * 1000);
    }, 500 + Math.random() * 500);
  };

  const getCoachAvatar = (coachId: CoachId) => {
    if (coachId === "kai") return kaiAvatar;
    return CONTACTS[coachId].avatar;
  };

  return (
    <div className="phone-shell messages-gradient messages-pattern relative flex flex-col">
      {/* Header */}
      <header className="animate-in animate-in--1 relative flex items-center gap-3 px-4 pb-3 pt-16">
        <Link
          href="/messages"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          aria-label={t("nav.back")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex flex-1 items-center gap-3">
          <div className="flex -space-x-2">
            {COACH_ORDER.map((id) => (
              <div
                key={id}
                className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-zinc-800 bg-zinc-900"
              >
                <Image
                  src={getCoachAvatar(id)}
                  alt={COACH_NAMES[id]}
                  width={32}
                  height={32}
                  className="h-full w-full object-contain"
                />
              </div>
            ))}
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">{t("team_chat.title")}</h1>
            <p className="text-[10px] text-zinc-500">{t("team_chat.subtitle")}</p>
          </div>
        </div>
        <div className="absolute bottom-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-purple-400/30 to-transparent" />
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 pb-36 pt-4">
        <div className="flex flex-col gap-3">
          {/* Tüm mesajlar kronolojik sırayla */}
          {allMessages.map((msg) => (
            msg.type === "coach" ? (
              /* Koç mesajı */
              <div key={msg.id} className="flex max-w-[85%] items-end gap-2">
                <div className="relative h-8 w-8 shrink-0">
                  <Image
                    src={getCoachAvatar(msg.coachId!)}
                    alt={COACH_NAMES[msg.coachId!]}
                    width={32}
                    height={32}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-zinc-500">
                      {COACH_NAMES[msg.coachId!]}
                    </span>
                    <span className="text-[9px] text-zinc-600">{msg.time}</span>
                  </div>
                  <div
                    className={`rounded-2xl border px-4 py-2.5 text-sm leading-relaxed text-zinc-100 bg-gradient-to-br ${COACH_COLORS[msg.coachId!]}`}
                  >
                    {msg.text}
                  </div>
                </div>
              </div>
            ) : (
              /* Kullanıcı mesajı */
              <div key={msg.id} className="ml-auto flex max-w-[82%] flex-col items-end gap-1">
                <div className="rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 px-4 py-2.5 text-sm leading-relaxed text-white shadow-md shadow-purple-900/30">
                  {msg.text}
                </div>
                <span className="pr-1 text-[10px] text-zinc-600">{msg.time}</span>
              </div>
            )
          ))}

          {/* Yazıyor animasyonu */}
          {typingCoach && (
            <div className="flex max-w-[85%] items-end gap-2">
              <div className="relative h-8 w-8 shrink-0">
                <Image
                  src={getCoachAvatar(typingCoach)}
                  alt={COACH_NAMES[typingCoach]}
                  width={32}
                  height={32}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-medium text-zinc-500">
                  {COACH_NAMES[typingCoach]}
                </span>
                <div className="flex items-center gap-1.5 rounded-2xl border border-zinc-800 bg-zinc-900/80 px-5 py-3">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-white/5 bg-zinc-900/95 px-4 pb-8 pt-3 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={t("chat.placeholder.team")}
            className="flex-1 rounded-xl border border-white/10 bg-zinc-800/80 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
          />
          <button
            onClick={handleSend}
            disabled={!userInput.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-500 text-white transition hover:bg-purple-400 active:scale-95 disabled:opacity-40 disabled:hover:bg-purple-500"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
