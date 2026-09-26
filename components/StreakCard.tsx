"use client";

import { useRef, useState, useCallback } from "react";
import Image from "next/image";
import { Download, Share2, X, Flame } from "lucide-react";
import { KAI_LEVEL_AVATARS, type KaiLevel } from "@/lib/kai-level";
import { useLang } from "@/lib/lang-context";
import { toPng } from "html-to-image";
import { MotionDialog } from "@/components/ui/MotionDialog";

type StreakCardProps = {
  open: boolean;
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

export function StreakCard({ open, streak, kaiLevel, onClose }: StreakCardProps) {
  const { lang, t } = useLang();
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
          title: `Kaify Ai - ${streak} Day Streak!`,
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
    <MotionDialog
      open={open}
      onClose={onClose}
      labelledBy="streak-card-title"
      className="z-50 bg-black/80"
      panelClassName="relative flex w-full max-w-sm flex-col items-center gap-3"
      footer={
        <div className="flex w-full gap-3 px-1 pb-1">
          <button onClick={handleDownload} disabled={downloading} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 px-4 text-sm font-semibold text-white transition hover:from-purple-500 hover:to-violet-500 disabled:opacity-50">
            <Download className="h-4 w-4" />
            {downloading ? "Generating..." : t("streak.download")}
          </button>
          <button onClick={handleShare} disabled={downloading} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-50">
            <Share2 className="h-4 w-4" />
            {copied ? t("common.copied") : t("streak.share")}
          </button>
        </div>
      }
    >
      <button onClick={onClose} className="touch-44 mb-2 flex h-11 w-11 items-center justify-center self-end rounded-full bg-white/10 text-zinc-400 transition hover:bg-white/20 hover:text-white" aria-label={t("common.close")}>
        <X className="h-4 w-4" />
      </button>

      <div
        ref={cardRef}
        className="relative flex w-full flex-col overflow-hidden rounded-3xl shadow-2xl"
        style={{ background: theme.gradient, aspectRatio: "9 / 16", maxHeight: "min(68dvh, 640px)" }}
      >
        <div className="pointer-events-none absolute inset-0" style={{ background: `linear-gradient(180deg, ${theme.flameColor2}12 0%, transparent 30%, rgba(168,85,247,0.15) 50%, rgba(124,58,237,0.45) 85%, rgba(88,28,135,0.5) 100%)` }} />
        <div className="pointer-events-none absolute inset-0 opacity-70" style={{ background: `radial-gradient(circle at 30% 20%, ${theme.glowIntense}, transparent 60%), radial-gradient(circle at 70% 80%, ${theme.glow}, transparent 50%)` }} />
        {BG_ICONS.map((item, i) => (
          <span key={i} className="pointer-events-none absolute select-none" style={{ left: item.x, top: item.y, fontSize: item.size, opacity: 0.28, filter: `drop-shadow(0 0 6px ${theme.flameColor2}50)` }}>
            {item.icon}
          </span>
        ))}

        <div className="relative z-10 flex items-center justify-between gap-3 px-5 pt-5">
          <div className="flex min-w-0 items-center gap-2">
            <Image src="/kaify-logo.png" alt="Kaify Ai" width={32} height={32} className="avatar-art h-8 w-8 shrink-0" style={{ filter: `drop-shadow(0 0 12px ${theme.glow})` }} />
            <span className="truncate text-lg font-black tracking-wide text-white" style={{ textShadow: `0 0 24px ${theme.glow}` }}>Kaify Ai</span>
          </div>
          <div className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-sm font-bold text-white" style={{ border: `1px solid ${theme.flameColor2}50` }}>
            Lv.{kaiLevel}
          </div>
        </div>

        <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-4">
          <div className="streak-card-fx pointer-events-none absolute h-40 w-40 rounded-full" style={{
            background: `conic-gradient(from 0deg, ${theme.flameColor}, ${theme.flameColor2}, ${theme.glowIntense}, ${theme.flameColor})`,
            animation: "spin 4s linear infinite",
            maskImage: "radial-gradient(circle, transparent 58%, black 60%, black 70%, transparent 72%)",
            WebkitMaskImage: "radial-gradient(circle, transparent 58%, black 60%, black 70%, transparent 72%)",
            opacity: 0.7,
          }} />
          <div className="relative z-10 flex items-center gap-2">
            <Flame className="h-10 w-10 shrink-0" style={{ color: theme.flameColor, filter: `drop-shadow(0 0 18px ${theme.flameColor})` }} />
            <span className="font-black leading-none tracking-tighter text-white" style={{ fontSize: "clamp(4.25rem, 18vw, 6.5rem)", textShadow: `0 0 40px ${theme.glow}` }}>{streak}</span>
          </div>
          <span id="streak-card-title" className="relative z-10 mt-2 text-sm font-bold tracking-[0.28em]" style={{ color: theme.flameColor2 }}>
            {t("streak.daily").toLocaleUpperCase(lang)}
          </span>
        </div>

        <div className="relative z-10 flex justify-center py-2">
          <Image src={KAI_LEVEL_AVATARS[kaiLevel]} alt="Kai" width={132} height={132} className="avatar-art h-[132px] w-[132px]" priority />
        </div>

        <div className="relative z-10 px-5 pb-5 text-center">
          <p className="text-sm font-semibold italic" style={{ color: theme.flameColor2 }}>
            &ldquo;{t("streak.daily")} — keep the fire burning! 🔥&rdquo;
          </p>
          <p className="mt-2 text-xl font-black tracking-wider text-purple-200">Kaify Ai</p>
        </div>
      </div>
    </MotionDialog>
  );
}