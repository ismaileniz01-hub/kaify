"use client";

import { useRef, useState, useCallback } from "react";
import Image from "next/image";
import { Download, Share2, X, Flame } from "lucide-react";
import { KAI_LEVEL_AVATARS, type KaiLevel } from "@/lib/kai-level";
import { useLang } from "@/lib/lang-context";
import { toPng } from "html-to-image";

type StreakCardProps = {
  streak: number;
  kaiLevel: KaiLevel;
  userName?: string;
  onClose: () => void;
};

function getCardTheme(level: KaiLevel) {
  switch (level) {
    case 1:
      return {
        gradient: "linear-gradient(160deg, #ea580c, #b45309, #7f1d1d)",
        accent: "#ff6b00",
        glow: "rgba(251,191,36,0.6)",
        glowIntense: "rgba(251,191,36,0.9)",
        flameColor: "#ff6b00",
        flameColor2: "#ffd700",
        titleColor: "text-amber-300",
        badgeBg: "bg-orange-500/20",
        badgeText: "text-orange-300",
      };
    case 2:
      return {
        gradient: "linear-gradient(160deg, #d97706, #9a3412, #7f1d1d)",
        accent: "#f59e0b",
        glow: "rgba(245,158,11,0.7)",
        glowIntense: "rgba(245,158,11,1)",
        flameColor: "#f59e0b",
        flameColor2: "#fbbf24",
        titleColor: "text-amber-200",
        badgeBg: "bg-amber-500/20",
        badgeText: "text-amber-200",
      };
    case 3:
      return {
        gradient: "linear-gradient(160deg, #6b21a8, #4c1d95, #1e1b4b)",
        accent: "#8b5cf6",
        glow: "rgba(139,92,246,0.7)",
        glowIntense: "rgba(139,92,246,1)",
        flameColor: "#a78bfa",
        flameColor2: "#c4b5fd",
        titleColor: "text-purple-300",
        badgeBg: "bg-purple-500/20",
        badgeText: "text-purple-300",
      };
    case 4:
      return {
        gradient: "linear-gradient(160deg, #581c87, #86198f, #831843)",
        accent: "#a855f7",
        glow: "rgba(168,85,247,0.8)",
        glowIntense: "rgba(168,85,247,1)",
        flameColor: "#c084fc",
        flameColor2: "#e9d5ff",
        titleColor: "text-purple-200",
        badgeBg: "bg-purple-500/20",
        badgeText: "text-purple-200",
      };
  }
}

// Sabit konumlar - her seferinde aynı görünsün
const BG_ICONS = [
  { icon: "🏋️", x: "8%", y: "5%", size: 24 },
  { icon: "💪", x: "32%", y: "3%", size: 28 },
  { icon: "🏃", x: "56%", y: "6%", size: 22 },
  { icon: "🎯", x: "80%", y: "4%", size: 26 },
  { icon: "⚡", x: "12%", y: "35%", size: 30 },
  { icon: "🔥", x: "38%", y: "38%", size: 24 },
  { icon: "💎", x: "62%", y: "33%", size: 28 },
  { icon: "🏆", x: "86%", y: "36%", size: 22 },
  { icon: "💯", x: "6%", y: "68%", size: 26 },
  { icon: "⭐", x: "30%", y: "72%", size: 24 },
  { icon: "🏅", x: "54%", y: "66%", size: 30 },
  { icon: "🥇", x: "78%", y: "70%", size: 22 },
];

export function StreakCard({ streak, kaiLevel, userName, onClose }: StreakCardProps) {
  const { t } = useLang();
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const theme = getCardTheme(kaiLevel);

  // Base64 data URL'yi Blob'a çevir
  const dataUrlToBlob = (dataUrl: string): Blob => {
    const parts = dataUrl.split(",");
    const mime = parts[0].match(/:(.*?);/)![1];
    const bytes = atob(parts[1]);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      arr[i] = bytes.charCodeAt(i);
    }
    return new Blob([arr], { type: mime });
  };

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 3,
        backgroundColor: "#0a0a0a",
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = `kaify-streak-${streak}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to capture card:", err);
    }
    setDownloading(false);
  }, [streak]);

  const handleShare = useCallback(async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 3,
        backgroundColor: "#0a0a0a",
        cacheBust: true,
      });
      const blob = dataUrlToBlob(dataUrl);

      if (navigator.share) {
        const file = new File([blob], `kaify-streak-${streak}.png`, { type: "image/png" });
        await navigator.share({
          title: `Kaify - ${streak} Day Streak!`,
          files: [file],
        });
      } else {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error("Failed to share:", err);
    }
    setDownloading(false);
  }, [streak]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative flex flex-col items-center gap-4 max-w-sm w-full">
        <button onClick={onClose} className="self-end flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-zinc-400 transition hover:bg-white/20 hover:text-white">
          <X className="h-4 w-4" />
        </button>

        {/* Kart - html-to-image ile yakalanacak */}
        <div ref={cardRef} className="relative w-full aspect-[9/16] rounded-3xl overflow-hidden shadow-2xl" style={{ background: theme.gradient }}>
          {/* Overlay renk geçişi */}
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${theme.flameColor2}12 0%, transparent 30%, rgba(168,85,247,0.15) 50%, rgba(124,58,237,0.45) 85%, rgba(88,28,135,0.5) 100%)` }} />

          {/* Glow efekti */}
          <div className="absolute inset-0 opacity-70" style={{ background: `radial-gradient(circle at 30% 20%, ${theme.glowIntense}, transparent 60%), radial-gradient(circle at 70% 80%, ${theme.glow}, transparent 50%), radial-gradient(circle at 50% 50%, rgba(168,85,247,0.5), transparent 60%)` }} />

          {/* Arka plan ikonları */}
          {BG_ICONS.map((item, i) => (
            <span key={i} className="absolute pointer-events-none select-none" style={{ left: item.x, top: item.y, fontSize: item.size, opacity: 0.35, filter: `drop-shadow(0 0 6px ${theme.flameColor2}50)` }}>
              {item.icon}
            </span>
          ))}

          {/* Işık halkaları */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[120px] h-[120px] rounded-full border" style={{ borderColor: `${theme.flameColor2}40`, boxShadow: `inset 0 0 20px ${theme.flameColor2}20` }} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full border" style={{ borderColor: `${theme.flameColor2}30`, boxShadow: `inset 0 0 20px ${theme.flameColor2}15` }} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] rounded-full border" style={{ borderColor: `${theme.flameColor2}20`, boxShadow: `inset 0 0 20px ${theme.flameColor2}10` }} />

          {/* Üst kısım */}
          <div className="absolute top-8 left-6 right-6 flex items-start justify-between z-10">
            <div className="flex items-center gap-3">
              <Image src="/kaify-logo.png" alt="Kaify" width={36} height={36} className="rounded-xl" style={{ filter: `drop-shadow(0 0 12px ${theme.glow})` }} />
              <span className="text-2xl font-black text-white tracking-wide" style={{ textShadow: `0 0 30px ${theme.glow}, 0 0 60px ${theme.glowIntense}` }}>KAIFY</span>
            </div>
            <div className="px-4 py-1.5 rounded-full text-sm font-bold bg-white/15 text-white ring-1" style={{ border: `1px solid ${theme.flameColor2}50`, boxShadow: `0 0 15px ${theme.flameColor2}30` }}>
              Lv.{kaiLevel}
            </div>
          </div>

          {/* Sayı - üst kısımda */}
          <div className="absolute top-28 left-0 right-0 flex flex-col items-center z-10">
            {/* Dönen ışık çemberi */}
            <div className="absolute w-64 h-64 rounded-full" style={{
              background: `conic-gradient(from 0deg, ${theme.flameColor}, ${theme.flameColor2}, ${theme.glowIntense}, ${theme.flameColor})`,
              animation: "spin 4s linear infinite",
              maskImage: "radial-gradient(circle, transparent 45%, black 46%, black 54%, transparent 55%)",
              WebkitMaskImage: "radial-gradient(circle, transparent 45%, black 46%, black 54%, transparent 55%)",
              opacity: 0.7,
            }} />
            {/* İkinci ters dönen çember */}
            <div className="absolute w-80 h-80 rounded-full" style={{
              background: `conic-gradient(from 180deg, ${theme.flameColor2}, transparent, ${theme.glowIntense}, transparent)`,
              animation: "spin 6s linear infinite reverse",
              maskImage: "radial-gradient(circle, transparent 40%, black 41%, black 59%, transparent 60%)",
              WebkitMaskImage: "radial-gradient(circle, transparent 40%, black 41%, black 59%, transparent 60%)",
              opacity: 0.5,
            }} />
            {/* Sayının arkasında parlama */}
            <div className="absolute w-96 h-96 rounded-full blur-3xl opacity-60" style={{ background: `radial-gradient(circle, ${theme.glowIntense}, ${theme.flameColor}40, transparent 70%)` }} />

            {/* Yükselen kıvılcımlar */}
            {[...Array(12)].map((_, i) => {
              const angle = (i / 12) * 360;
              const dist = 60 + Math.random() * 40;
              return (
                <div key={i} className="absolute w-1.5 h-1.5 rounded-full" style={{
                  background: i % 2 === 0 ? theme.flameColor : theme.flameColor2,
                  boxShadow: `0 0 6px ${i % 2 === 0 ? theme.flameColor : theme.flameColor2}`,
                  animation: `sparkFloat ${2 + Math.random() * 2}s ${Math.random() * 2}s ease-out infinite`,
                  opacity: 0.8,
                }} />
              );
            })}

            {/* Alev tabanı - sayının altında */}
            <div className="absolute bottom-0 w-32 h-16" style={{
              background: `linear-gradient(to top, ${theme.flameColor}, ${theme.flameColor2}80, transparent)`,
              filter: "blur(12px)",
              animation: "flameFlicker 0.8s ease-in-out infinite alternate",
              opacity: 0.6,
            }} />

            <div className="flex items-center gap-3 relative">
              <Flame className="w-14 h-14" style={{ color: theme.flameColor, filter: `drop-shadow(0 0 30px ${theme.flameColor}) drop-shadow(0 0 60px ${theme.glow})` }} />
              <span className="text-[120px] font-black leading-none tracking-tighter" style={{ color: "#ffffff", textShadow: `0 0 60px ${theme.glow}, 0 0 120px ${theme.glowIntense}, 0 0 180px ${theme.flameColor}` }}>{streak}</span>
            </div>
            <span className="text-xl font-bold mt-3 tracking-[0.4em]" style={{ color: theme.flameColor2, textShadow: `0 0 30px ${theme.glow}, 0 0 60px ${theme.glowIntense}` }}>
              {t("streak.daily").toUpperCase()}
            </span>
          </div>

          {/* Kai Avatar - ortaya yakın, biraz yukarıda */}
          <div className="absolute left-0 right-0 top-[58%] -translate-y-1/2 flex items-center justify-center z-10">
            <div className="absolute w-80 h-80 rounded-full blur-3xl opacity-40" style={{ background: `radial-gradient(circle, ${theme.glowIntense}, transparent 70%)` }} />
            <div style={{ filter: `drop-shadow(0 0 30px ${theme.glow}) drop-shadow(0 0 60px ${theme.glowIntense})` }}>
              <Image src={KAI_LEVEL_AVATARS[kaiLevel]} alt="Kai" width={180} height={180} className="object-contain" priority />
            </div>
          </div>

          {/* Motivasyon mesajı - en alt */}
          <div className="absolute bottom-24 left-6 right-6 text-center z-10">
            <p className="text-sm italic font-semibold" style={{ color: theme.flameColor2, textShadow: `0 0 15px ${theme.glow}` }}>
              &ldquo;{t("streak.daily")} — keep the fire burning! 🔥&rdquo;
            </p>
          </div>

          {/* KAIFY logosu */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10">
            <span className="text-3xl font-black tracking-wider" style={{ background: "linear-gradient(135deg, #c084fc, #a855f7, #7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", filter: "drop-shadow(0 0 20px rgba(168,85,247,0.5))" }}>
              KAIFY
            </span>
          </div>
        </div>

        {/* Butonlar */}
        <div className="flex gap-3 w-full">
          <button onClick={handleDownload} disabled={downloading} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-purple-500 hover:to-violet-500 disabled:opacity-50">
            <Download className="h-4 w-4" />
            {downloading ? "Generating..." : t("streak.download")}
          </button>
          <button onClick={handleShare} disabled={downloading} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-50">
            <Share2 className="h-4 w-4" />
            {copied ? t("common.copied") : t("streak.share")}
          </button>
        </div>
      </div>
    </div>
  );
}