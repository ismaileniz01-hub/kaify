"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { ContactId } from "@/lib/contacts";
import { CHAT_THREADS, CONTACTS } from "@/lib/contacts";
import { useKai } from "@/lib/kai-context";
import { useSound } from "@/lib/use-sound";
import { DEMO_USER_PROFILE } from "@/lib/user";
import { useLang } from "@/lib/lang-context";
import { Activity, Target, Lightbulb, TrendingUp, Dumbbell } from "lucide-react";

type ChatBubblesProps = {
  contactId: ContactId;
  onTypingChange?: (isTyping: boolean) => void;
  onUserTyping?: (isTyping: boolean) => void;
  onConversationEnd?: () => void;
  userMessages?: { text: string; time: string }[];
};

type MessageItem = {
  id: number;
  text: string;
  from: "user" | "contact";
  time: string;
  visible: boolean;
  type?: string;
  analysis?: any;
  mealPlan?: any;
  workoutPlan?: any;
  dailySummary?: any;
};

export function ChatBubbles({ contactId, onTypingChange, onUserTyping, onConversationEnd, userMessages = [] }: ChatBubblesProps) {
  const { t } = useLang();
  const contact = CONTACTS[contactId];
  const messages = CHAT_THREADS[contactId];
  const onConversationEndRef = useRef(onConversationEnd);
  onConversationEndRef.current = onConversationEnd;
  const { avatar: kaiAvatar } = useKai();
  const contactAvatar = contactId === "kai" ? kaiAvatar : contact.avatar;
  const { play } = useSound();
  const [allMessages, setAllMessages] = useState<MessageItem[]>([]);
  const [typingId, setTypingId] = useState<number | null>(null);
  const prevVisibleCountRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const nextIdRef = useRef(1000);

  useEffect(() => {
    const contactMessages = messages.filter((msg) => msg.from === "contact");
    const initial: MessageItem[] = contactMessages.map((msg) => ({ ...msg, visible: false }));
    setAllMessages(initial);
    setTypingId(null);
    let delay = 0;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    initial.forEach((msg) => {
      delay += 500 + Math.random() * 400;
      const t = setTimeout(() => setTypingId(msg.id), delay);
      timeouts.push(t);
      delay += 700 + Math.random() * 500;
      const m = setTimeout(() => { setTypingId(null); setAllMessages((prev) => prev.map((s) => s.id === msg.id ? { ...s, visible: true } : s)); }, delay);
      timeouts.push(m);
    });
    const endTimeout = setTimeout(() => onConversationEndRef.current?.(), delay + 1000);
    timeouts.push(endTimeout);
    return () => timeouts.forEach(clearTimeout);
  }, [contactId]);

  useEffect(() => {
    const visibleCount = allMessages.filter((s) => s.visible).length;
    if (visibleCount > prevVisibleCountRef.current) {
      const lastVisible = allMessages.filter((s) => s.visible).pop();
      if (lastVisible) play(lastVisible.from === "contact" ? "receive" : "send");
    }
    prevVisibleCountRef.current = visibleCount;
  }, [allMessages, play]);

  useEffect(() => {
    if (typingId !== null) {
      const msg = allMessages.find(m => m.id === typingId);
      onTypingChange?.(msg?.from === "contact");
      onUserTyping?.(msg?.from === "user");
    } else { onTypingChange?.(false); onUserTyping?.(false); }
  }, [typingId, allMessages, onTypingChange, onUserTyping]);

  const lastUserMsgCount = useRef(0);
  useEffect(() => {
    if (userMessages.length > lastUserMsgCount.current) {
      const newMsg = userMessages[userMessages.length - 1];
      const uid = nextIdRef.current++;
      lastUserMsgCount.current = userMessages.length;
      setAllMessages((prev) => [...prev, { id: uid, text: newMsg.text, from: "user", time: newMsg.time, visible: true }]);
      const replies = messages.filter((m) => m.from === "contact");
      const idx = userMessages.length - 1;
      if (idx < replies.length) {
        const reply = replies[idx];
        const rid = nextIdRef.current++;
        const typingTimer = setTimeout(() => setTypingId(rid), 300 + Math.random() * 400);
        const replyTimer = setTimeout(() => {
          setTypingId(null);
          setAllMessages((prev) => [
            ...prev,
            { id: rid, text: reply.text, from: "contact", time: reply.time, visible: true },
          ]);
        }, 1000 + Math.random() * 800);
        return () => {
          clearTimeout(typingTimer);
          clearTimeout(replyTimer);
        };
      }
    }
  }, [userMessages, messages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [allMessages, typingId]);

  const { primary, primaryLight, secondary, ring, shadow } = contact.color;

  const renderCard = (msg: MessageItem) => {
    if (msg.type === "analysis" && msg.analysis) {
      const a = msg.analysis;
      return (
        <div className="animate-message overflow-hidden rounded-2xl" style={{ backgroundColor: `${primary}10`, border: `1px solid ${ring}`, boxShadow: `0 0 20px ${ring}` }}>
          <div className="flex items-center gap-3 p-3" style={{ borderBottom: `1px solid ${ring}` }}>
            <div className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-black text-white" style={{ background: `conic-gradient(${primary} ${a.overallScore * 10}%, #1a1a2e ${a.overallScore * 10}%)`, boxShadow: `0 0 15px ${ring}` }}>{a.overallScore}</div>
            <div><p className="text-sm font-bold text-white">{t("analysis.score")}</p><p className="text-xs text-zinc-400">{t("analysis.overall")}</p></div>
          </div>
          <div className="flex flex-col gap-2 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400"><Target className="h-3.5 w-3.5" />{t("analysis.categories")}</p>
            {[...(a.categories || []), ...(a.extraCategories || [])].map((cat: any, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-24 text-[11px] text-zinc-400">{t(cat.key)}</span>
                <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${(cat.score / cat.maxScore) * 100}%`, backgroundColor: cat.color, boxShadow: `0 0 6px ${cat.color}` }} /></div>
                <span className="w-10 text-right text-[11px] font-bold" style={{ color: cat.color }}>{cat.score}</span>
              </div>
            ))}
          </div>
          {a.tips?.length > 0 && (
            <div className="flex flex-col gap-1.5 p-3" style={{ borderTop: `1px solid ${ring}` }}>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400"><Lightbulb className="h-3.5 w-3.5" />{t("analysis.tips")}</p>
              {a.tips.map((tip: string, i: number) => (
                <div key={i} className="flex items-start gap-2"><div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: primary }} /><span className="text-[11px] leading-relaxed text-zinc-300">{tip}</span></div>
              ))}
            </div>
          )}
        </div>
      );
    }
    if (msg.type === "mealPlan" && msg.mealPlan) {
      const mp = msg.mealPlan;
      const calPct = Math.round((mp.totalCalories / mp.targetCalories) * 100);
      const macros = [
        { key: "meal.protein", color: "#ef4444", data: mp.macros.protein },
        { key: "meal.carbs", color: "#f59e0b", data: mp.macros.carbs },
        { key: "meal.fat", color: "#3b82f6", data: mp.macros.fat },
      ];
      return (
        <div className="animate-message overflow-hidden rounded-2xl" style={{ backgroundColor: `${primary}10`, border: `1px solid ${ring}`, boxShadow: `0 0 20px ${ring}` }}>
          <div className="flex items-center gap-3 p-3" style={{ borderBottom: `1px solid ${ring}` }}>
            <div className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-black text-white" style={{ background: `conic-gradient(${primary} ${calPct}%, #1a1a2e ${calPct}%)`, boxShadow: `0 0 15px ${ring}` }}>{calPct}%</div>
            <div><p className="text-sm font-bold text-white">{t("meal.calories")}</p><p className="text-xs text-zinc-400">{t("meal.calorie_progress", { current: mp.totalCalories, target: mp.targetCalories })}</p></div>
          </div>
          <div className="flex flex-col gap-2 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400"><Target className="h-3.5 w-3.5" />{t("meal.macros")}</p>
            {macros.map((m, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-16 text-[11px] text-zinc-400">{t(m.key)}</span>
                <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${(m.data.current / m.data.target) * 100}%`, backgroundColor: m.color, boxShadow: `0 0 6px ${m.color}` }} /></div>
                <span className="w-20 text-right text-[11px]" style={{ color: m.color }}>{m.data.current}g / {m.data.target}g</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 p-3" style={{ borderTop: `1px solid ${ring}` }}>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400"><TrendingUp className="h-3.5 w-3.5" />{t("meal.meals")}</p>
            {mp.meals.map((meal: any, i: number) => (
              <div key={i}><p className="text-[11px] font-bold text-zinc-300 mb-1">{t(meal.labelKey)}</p>{meal.items.map((item: any, j: number) => (
                <div key={j} className="flex items-center justify-between pl-3"><span className="text-[11px] text-zinc-400">{item.name}</span><span className="text-[11px] text-zinc-500">{item.calories} kcal</span></div>
              ))}</div>
            ))}
          </div>
          {mp.tips?.length > 0 && (
            <div className="flex flex-col gap-1.5 p-3" style={{ borderTop: `1px solid ${ring}` }}>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400"><Lightbulb className="h-3.5 w-3.5" />{t("meal.tips")}</p>
              {mp.tips.map((tip: string, i: number) => (
                <div key={i} className="flex items-start gap-2"><div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: primary }} /><span className="text-[11px] leading-relaxed text-zinc-300">{tip}</span></div>
              ))}
            </div>
          )}
        </div>
      );
    }
    if (msg.type === "workoutPlan" && msg.workoutPlan) {
      const wp = msg.workoutPlan;
      return (
        <div className="animate-message overflow-hidden rounded-2xl" style={{ backgroundColor: `${primary}10`, border: `1px solid ${ring}`, boxShadow: `0 0 20px ${ring}` }}>
          <div className="flex items-center gap-3 p-3" style={{ borderBottom: `1px solid ${ring}` }}>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}><Dumbbell className="h-6 w-6 text-white" /></div>
            <div><p className="text-sm font-bold text-white">{t(wp.titleKey)}</p><p className="text-xs text-zinc-400">{t(wp.durationKey)}</p></div>
          </div>
          {wp.days.map((day: any, di: number) => (
            <div key={di} style={{ borderBottom: di < wp.days.length - 1 ? `1px solid ${ring}` : undefined }}>
              <div className="flex items-center gap-2 px-3 pt-3 pb-1"><p className="text-xs font-bold text-zinc-300">{t(day.dayKey)}</p><span className="text-[10px] text-zinc-500">—</span><span className="text-[10px] text-zinc-400">{t(day.focusKey)}</span></div>
              <div className="flex flex-col px-3 pb-2">{day.exercises.map((ex: any, ei: number) => (
                <div key={ei} className="flex items-start gap-2 py-1">
                  <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: primary }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2"><span className="text-[11px] font-medium text-white truncate">{ex.name}</span><span className="shrink-0 text-[10px] text-zinc-500">{t("workout.sets", { sets: ex.sets, reps: ex.reps })}</span></div>
                    <p className="text-[10px] text-zinc-500 leading-relaxed mt-0.5">{ex.notes}</p>
                  </div>
                </div>
              ))}</div>
            </div>
          ))}
          {wp.tips?.length > 0 && (
            <div className="flex flex-col gap-1.5 p-3" style={{ borderTop: `1px solid ${ring}` }}>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400"><Lightbulb className="h-3.5 w-3.5" />{t("workout.tips")}</p>
              {wp.tips.map((tip: string, i: number) => (
                <div key={i} className="flex items-start gap-2"><div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: primary }} /><span className="text-[11px] leading-relaxed text-zinc-300">{tip}</span></div>
              ))}
            </div>
          )}
        </div>
      );
    }
    if (msg.type === "dailySummary" && msg.dailySummary) {
      const ds = msg.dailySummary;
      const calPct = Math.round((ds.nutrition.calories.current / ds.nutrition.calories.target) * 100);
      const protPct = Math.round((ds.nutrition.protein.current / ds.nutrition.protein.target) * 100);
      return (
        <div className="animate-message overflow-hidden rounded-2xl" style={{ backgroundColor: `${primary}10`, border: `1px solid ${ring}`, boxShadow: `0 0 20px ${ring}` }}>
          <div className="p-3 flex items-center gap-3" style={{ borderBottom: `1px solid ${ring}` }}>
            <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}><Activity className="h-6 w-6 text-white" /></div>
            <p className="text-sm font-bold text-white">{ds.greeting}</p>
          </div>
          <div className="p-3" style={{ borderBottom: `1px solid ${ring}` }}>
            <p className="text-xs font-bold text-zinc-400 flex items-center gap-1.5"><Dumbbell className="h-3 w-3" /> ANTRENMAN</p>
            <p className="text-xs text-zinc-300 mt-1">✅ Tamamlanan: <span className="text-white">{ds.workout.completed}</span></p>
            <p className="text-xs text-zinc-300">⏭️ Sıradaki: <span className="text-white">{ds.workout.next}</span></p>
            <p className="text-xs text-green-400 mt-1">{ds.workout.status}</p>
          </div>
          <div className="p-3" style={{ borderBottom: `1px solid ${ring}` }}>
            <p className="text-xs font-bold text-zinc-400 flex items-center gap-1.5"><TrendingUp className="h-3 w-3" /> BESLENME</p>
            <div className="flex items-center gap-2 mt-1"><span className="text-[10px] text-zinc-400">Kalori</span><div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${calPct}%`, backgroundColor: primary }} /></div><span className="text-[10px] text-zinc-400">{ds.nutrition.calories.current}/{ds.nutrition.calories.target}</span></div>
            <div className="flex items-center gap-2 mt-1"><span className="text-[10px] text-zinc-400">Protein</span><div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${protPct}%`, backgroundColor: "#ef4444" }} /></div><span className="text-[10px] text-zinc-400">{ds.nutrition.protein.current}g/{ds.nutrition.protein.target}g</span></div>
            <p className="text-[10px] text-zinc-300 mt-1">{ds.nutrition.highlight}</p>
          </div>
          <div className="p-3" style={{ borderBottom: `1px solid ${ring}` }}>
            <p className="text-xs font-bold text-zinc-400 flex items-center gap-1.5"><Target className="h-3 w-3" /> VÜCUT ANALİZİ</p>
            <p className="text-xs text-zinc-300 mt-1">{ds.bodyScore.focus}</p>
          </div>
          <div className="p-3"><p className="text-xs leading-relaxed text-zinc-200">{ds.motivation}</p></div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-4 pb-36 pt-4">
      <div className="mt-auto flex flex-col gap-3">
        {allMessages.map((msg) => (
          <div key={msg.id}>
            {typingId === msg.id && (
              msg.from === "contact" ? (
                <div className="flex max-w-[82%] items-end gap-2">
                  <div className="relative h-8 w-8 shrink-0"><Image src={contactId === "leo" ? "/avatars/leo-1.png" : contactAvatar} alt={contact.name} width={32} height={32} className="h-full w-full object-contain [image-rendering:pixelated]" style={{ filter: "brightness(1.05) contrast(1.1)" }} /></div>
                  <div className="flex items-center gap-1.5 px-5 py-3.5" style={{ backgroundColor: `${primary}22`, borderRadius: "18px 18px 18px 4px", boxShadow: `0 0 20px ${ring}` }}>
                    <span className="typing-dot" style={{ backgroundColor: primaryLight }} /><span className="typing-dot" style={{ backgroundColor: primaryLight }} /><span className="typing-dot" style={{ backgroundColor: primaryLight }} />
                  </div>
                </div>
              ) : (
                <div className="flex max-w-[82%] flex-col items-end gap-1 self-end">
                  <div className="flex items-end gap-2">
                    <div className="flex items-center gap-1.5 px-5 py-3.5" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})`, borderRadius: "18px 18px 4px 18px", boxShadow: `0 4px 15px ${shadow}` }}>
                      <span className="typing-dot typing-dot--user" /><span className="typing-dot typing-dot--user" /><span className="typing-dot typing-dot--user" />
                    </div>
                    <div className="relative h-8 w-8 shrink-0"><Image src={DEMO_USER_PROFILE.avatar} alt={DEMO_USER_PROFILE.name} width={32} height={32} className="h-full w-full rounded-full object-cover" /></div>
                  </div>
                </div>
              )
            )}
            {msg.visible && (
              msg.from === "contact" ? (
                ["analysis", "mealPlan", "workoutPlan", "dailySummary"].includes(msg.type || "") ? (
                  <div className="flex max-w-[90%] items-start gap-2">
                    <div className="relative h-8 w-8 shrink-0 mt-1"><Image src={contactAvatar} alt={contact.name} width={32} height={32} className="h-full w-full object-contain" /></div>
                    <div className="flex flex-col gap-1">
                      <div className="animate-message px-4 py-2.5 text-sm leading-relaxed text-white" style={{ backgroundColor: `${primary}18`, borderRadius: "18px 18px 18px 4px", boxShadow: `0 0 15px ${ring}`, border: `1px solid ${ring}` }}>{msg.text}</div>
                      {renderCard(msg)}
                      <span className="pl-1 text-[10px] text-zinc-600">{msg.time}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex max-w-[82%] items-end gap-2">
                    <div className="relative h-8 w-8 shrink-0"><Image src={contactAvatar} alt={contact.name} width={32} height={32} className="h-full w-full object-contain" /></div>
                    <div className="flex flex-col gap-1">
                      <div className="animate-message px-4 py-2.5 text-sm leading-relaxed text-white" style={{ backgroundColor: `${primary}18`, borderRadius: "18px 18px 18px 4px", boxShadow: `0 0 15px ${ring}`, border: `1px solid ${ring}` }}>{msg.text}</div>
                      <span className="pl-1 text-[10px] text-zinc-600">{msg.time}</span>
                    </div>
                  </div>
                )
              ) : (
                <div className="ml-auto flex max-w-[82%] flex-col items-end gap-1">
                  <div className="flex items-end gap-2">
                    <div className="flex flex-col items-end gap-1">
                      <div className="animate-message px-4 py-2.5 text-sm leading-relaxed text-white" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})`, borderRadius: "18px 18px 4px 18px", boxShadow: `0 4px 15px ${shadow}` }}>{msg.text}</div>
                      <span className="pr-1 text-[10px] text-zinc-600">{msg.time}</span>
                    </div>
                    <div className="relative h-8 w-8 shrink-0"><Image src={DEMO_USER_PROFILE.avatar} alt={DEMO_USER_PROFILE.name} width={32} height={32} className="h-full w-full rounded-full object-cover" /></div>
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