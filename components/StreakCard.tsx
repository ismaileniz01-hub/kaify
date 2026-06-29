"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { Download, Share2, X, Flame, Sparkles, Trophy } from "lucide-react";
import { KAI_LEVEL_AVATARS, type KaiLevel } from "@/lib/kai-level";
import { useLang } from "@/lib/lang-context";

type StreakCardProps = {
  streak: number;
  kaiLevel: KaiLevel;
  userName?: string;
  onClose: () => void;
};

const MOTIVATIONAL_MESSAGES: Record<string, string[]> = {
  tr: [
    "Günde 1 kez daha güçlüyüm!",
    "Vazgeçmek yok, her gün bir adım!",
    "Disiplin, motivasyonu yener!",
    "Her gün yeni bir zafer!",
    "Küçük adımlar, büyük sonuçlar!",
    "Alev alev yanıyorum!",
    "Durmak yok, devam!",
  ],
  en: [
    "One day stronger, every day!",
    "Never give up, keep pushing!",
    "Discipline beats motivation!",
    "Every day is a new victory!",
    "Small steps, big results!",
    "Burning with passion!",
    "No days off!",
  ],
};

function getRandomMessage(lang: string): string {
  const messages = MOTIVATIONAL_MESSAGES[lang] || MOTIVATIONAL_MESSAGES.en;
  return messages[Math.floor(Math.random() * messages.length)];
}

function getCardTheme(level: KaiLevel) {
  switch (level) {
    case 1:
      return {
        gradient: "from-orange-600 via-amber-700 to-red-900",
        accent: "#ff6b00",
        glow: "rgba(251,191,36,0.6)",
        glowIntense: "rgba(251,191,36,0.9)",
        flameColor: "#ff6b00",
        flameColor2: "#ffd700",
        titleColor: "text-amber-300",
        badgeBg: "bg-orange-500/20",
        badgeText: "text-orange-300",
        particleColors: ["#ff6b00", "#ffd700", "#ff4500", "#ff0000", "#ffff00"],
        ringColor: "rgba(251,191,36,0.3)",
        sparkColor: "#ffd700",
        shapeColor: "rgba(255,107,0,0.15)",
        shapeBorder: "rgba(255,215,0,0.3)",
      };
    case 2:
      return {
        gradient: "from-amber-700 via-orange-800 to-red-900",
        accent: "#f59e0b",
        glow: "rgba(245,158,11,0.7)",
        glowIntense: "rgba(245,158,11,1)",
        flameColor: "#f59e0b",
        flameColor2: "#fbbf24",
        titleColor: "text-amber-200",
        badgeBg: "bg-amber-500/20",
        badgeText: "text-amber-200",
        particleColors: ["#f59e0b", "#fbbf24", "#f97316", "#ef4444", "#fde68a"],
        ringColor: "rgba(245,158,11,0.3)",
        sparkColor: "#fbbf24",
        shapeColor: "rgba(245,158,11,0.15)",
        shapeBorder: "rgba(251,191,36,0.3)",
      };
    case 3:
      return {
        gradient: "from-purple-800 via-violet-900 to-indigo-950",
        accent: "#8b5cf6",
        glow: "rgba(139,92,246,0.7)",
        glowIntense: "rgba(139,92,246,1)",
        flameColor: "#a78bfa",
        flameColor2: "#c4b5fd",
        titleColor: "text-purple-300",
        badgeBg: "bg-purple-500/20",
        badgeText: "text-purple-300",
        particleColors: ["#8b5cf6", "#a78bfa", "#7c3aed", "#6d28d9", "#c4b5fd"],
        ringColor: "rgba(139,92,246,0.3)",
        sparkColor: "#c4b5fd",
        shapeColor: "rgba(139,92,246,0.15)",
        shapeBorder: "rgba(196,181,253,0.3)",
      };
    case 4:
      return {
        gradient: "from-purple-900 via-fuchsia-900 to-pink-950",
        accent: "#a855f7",
        glow: "rgba(168,85,247,0.8)",
        glowIntense: "rgba(168,85,247,1)",
        flameColor: "#c084fc",
        flameColor2: "#e9d5ff",
        titleColor: "text-purple-200",
        badgeBg: "bg-purple-500/20",
        badgeText: "text-purple-200",
        particleColors: ["#a855f7", "#c084fc", "#d8b4fe", "#7c3aed", "#e9d5ff"],
        ringColor: "rgba(168,85,247,0.3)",
        sparkColor: "#e9d5ff",
        shapeColor: "rgba(168,85,247,0.15)",
        shapeBorder: "rgba(233,213,255,0.3)",
      };
  }
}

function Particle({ index, theme }: { index: number; theme: ReturnType<typeof getCardTheme> }) {
  const isLevel3Plus = index >= 3;
  const size = 2 + Math.random() * 4;
  const startX = Math.random() * 100;
  const duration = 2 + Math.random() * 3;
  const delay = Math.random() * 4;
  const drift = (Math.random() - 0.5) * 40;
  const color = theme.particleColors[index % theme.particleColors.length];

  return (
    <div
      className="absolute rounded-full"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        left: `${startX}%`,
        bottom: "-5%",
        background: color,
        boxShadow: `0 0 ${size * 3}px ${color}`,
        animation: `streakParticleRise ${duration}s ${delay}s ease-out infinite`,
        transform: `translateX(${drift}px)`,
        opacity: 0.6 + Math.random() * 0.4,
        clipPath: isLevel3Plus ? 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' : undefined,
        borderRadius: isLevel3Plus ? '2px' : '50%',
      }}
    />
  );
}

function FloatingOrb({ index, theme }: { index: number; theme: ReturnType<typeof getCardTheme> }) {
  const size = 20 + Math.random() * 40;
  const startX = 10 + Math.random() * 80;
  const duration = 4 + Math.random() * 4;
  const delay = Math.random() * 5;
  const floatY = 10 + Math.random() * 20;

  return (
    <div
      className="absolute rounded-full blur-xl"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        left: `${startX}%`,
        top: `${10 + Math.random() * 60}%`,
        background: `radial-gradient(circle, ${theme.glow}, transparent 70%)`,
        animation: `streakFloat ${duration}s ${delay}s ease-in-out infinite`,
        transform: `translateY(${floatY}px)`,
        opacity: 0.2 + Math.random() * 0.3,
      }}
    />
  );
}

function SparkleStar({ index, theme }: { index: number; theme: ReturnType<typeof getCardTheme> }) {
  const size = 4 + Math.random() * 8;
  const startX = 5 + Math.random() * 90;
  const startY = 5 + Math.random() * 90;
  const duration = 1.5 + Math.random() * 2;
  const delay = Math.random() * 3;

  return (
    <div
      className="absolute"
      style={{
        left: `${startX}%`,
        top: `${startY}%`,
        animation: `streakSparkle ${duration}s ${delay}s ease-in-out infinite`,
      }}
    >
      <div
        className="rounded-full"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          background: theme.sparkColor,
          boxShadow: `0 0 ${size * 2}px ${theme.sparkColor}, 0 0 ${size * 4}px ${theme.glow}`,
          clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
        }}
      />
    </div>
  );
}

function GlowRing({ index, theme }: { index: number; theme: ReturnType<typeof getCardTheme> }) {
  const size = 100 + index * 60;
  const duration = 3 + index * 0.5;
  const delay = index * 0.3;

  return (
    <div
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderColor: theme.ringColor,
        boxShadow: `inset 0 0 20px ${theme.ringColor}`,
        animation: `streakRingExpand ${duration}s ${delay}s ease-out infinite`,
      }}
    />
  );
}

function RotatingShape({ index, theme }: { index: number; theme: ReturnType<typeof getCardTheme> }) {
  const size = 30 + Math.random() * 50;
  const startX = 5 + Math.random() * 90;
  const startY = 5 + Math.random() * 90;
  const duration = 8 + Math.random() * 10;
  const delay = Math.random() * 5;
  const shapes = [
    'polygon(50% 0%, 0% 100%, 100% 100%)',
    'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
    'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
    'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
    'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
  ];

  return (
    <div
      className="absolute"
      style={{
        left: `${startX}%`,
        top: `${startY}%`,
        width: `${size}px`,
        height: `${size}px`,
        animation: `streakShapeSpin ${duration}s ${delay}s linear infinite`,
        opacity: 0.3 + Math.random() * 0.3,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          background: theme.shapeColor,
          border: `1px solid ${theme.shapeBorder}`,
          clipPath: shapes[index % shapes.length],
          boxShadow: `0 0 15px ${theme.shapeBorder}`,
        }}
      />
    </div>
  );
}

function ScanLine({ index, theme }: { index: number; theme: ReturnType<typeof getCardTheme> }) {
  const delay = index * 2;
  const duration = 3 + Math.random() * 2;
  const top = 10 + Math.random() * 80;

  return (
    <div
      className="absolute left-0 right-0 h-px pointer-events-none"
      style={{
        top: `${top}%`,
        background: `linear-gradient(to right, transparent, ${theme.flameColor2}, transparent)`,
        animation: `streakScanLine ${duration}s ${delay}s ease-in-out infinite`,
        opacity: 0.4,
        boxShadow: `0 0 8px ${theme.flameColor2}`,
      }}
    />
  );
}

function Bubble({ index, theme }: { index: number; theme: ReturnType<typeof getCardTheme> }) {
  const size = 8 + Math.random() * 20;
  const startX = 5 + Math.random() * 90;
  const duration = 5 + Math.random() * 5;
  const delay = Math.random() * 6;
  const drift = (Math.random() - 0.5) * 60;

  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        left: `${startX}%`,
        bottom: "-10%",
        border: `1px solid ${theme.flameColor2}40`,
        background: `radial-gradient(circle at 30% 30%, ${theme.flameColor2}20, transparent)`,
        animation: `streakBubbleRise ${duration}s ${delay}s ease-in-out infinite`,
        transform: `translateX(${drift}px)`,
        boxShadow: `inset 0 0 ${size}px ${theme.flameColor2}10`,
      }}
    />
  );
}

// Fitness ikonları - düzenli grid, yumuşak animasyon
const FITNESS_ICONS = ["🏋️", "💪", "🏃", "🎯", "⚡", "🔥", "💎", "🏆", "💯", "⭐", "🏅", "🥇"];
const ICON_POSITIONS = [
  // 3 satır × 4 sütun = 12 pozisyon
  { x: 8, y: 5 },   { x: 32, y: 3 },  { x: 56, y: 6 },  { x: 80, y: 4 },
  { x: 12, y: 35 },  { x: 38, y: 38 }, { x: 62, y: 33 }, { x: 86, y: 36 },
  { x: 6, y: 68 },   { x: 30, y: 72 }, { x: 54, y: 66 }, { x: 78, y: 70 },
];

function FitnessIcon({ index, theme }: { index: number; theme: ReturnType<typeof getCardTheme> }) {
  const icon = FITNESS_ICONS[index % FITNESS_ICONS.length];
  const pos = ICON_POSITIONS[index % ICON_POSITIONS.length];
  const size = 22 + (index % 3) * 6; // 22, 28, 34px düzenli
  const duration = 5 + (index % 4);  // 5-8s
  const delay = (index * 0.4) % 3;   // kademeli başlangıç

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        fontSize: `${size}px`,
        animation: `streakFitnessFloat ${duration}s ${delay}s ease-in-out infinite`,
        opacity: 0.3 + (index % 3) * 0.1,
        filter: `drop-shadow(0 0 6px ${theme.flameColor2}50) drop-shadow(0 0 12px ${theme.glow}30)`,
        willChange: 'transform',
        zIndex: 1,
      }}
    >
      {icon}
    </div>
  );
}

// Enerji dalgası - sayının arkasında patlama efekti
function EnergyBurst({ theme }: { theme: ReturnType<typeof getCardTheme> }) {
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={`burst-${i}`}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: `${60 + i * 50}px`,
            height: `${60 + i * 50}px`,
            border: `1px solid ${theme.flameColor2}${30 + i * 10}`,
            boxShadow: `0 0 ${20 + i * 15}px ${theme.flameColor}${20 + i * 10}`,
            animation: `streakEnergyBurst ${2 + i * 0.3}s ${i * 0.2}s ease-out infinite`,
            opacity: 0,
          }}
        />
      ))}
    </>
  );
}

// Işın ışınları - sayıdan dışarı yayılan
function LightRays({ theme }: { theme: ReturnType<typeof getCardTheme> }) {
  return (
    <>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div
          key={`ray-${i}`}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: '2px',
            height: `${80 + Math.random() * 60}px`,
            background: `linear-gradient(to top, ${theme.flameColor2}, transparent)`,
            transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateY(-30px)`,
            animation: `streakLightRay ${1.5 + Math.random() * 1}s ${i * 0.15}s ease-in-out infinite`,
            opacity: 0,
            boxShadow: `0 0 6px ${theme.flameColor2}`,
          }}
        />
      ))}
    </>
  );
}

export function StreakCard({ streak, kaiLevel, userName, onClose }: StreakCardProps) {
  const { t, lang } = useLang();
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const theme = getCardTheme(kaiLevel);
  const message = getRandomMessage(lang);

  // RGBA rengin alpha'sını değiştir
  const withAlpha = (color: string, alpha: number): string => {
    // rgba(r,g,b,a) formatını parse et
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
    if (match) {
      return `rgba(${match[1]},${match[2]},${match[3]},${alpha})`;
    }
    // hex format
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    }
    return color;
  };

  // Canvas üzerine kartı manuel çiz (html2canvas kullanmaz, createPattern hatası olmaz)
  const captureCard = useCallback(async (): Promise<HTMLCanvasElement | null> => {
    const CARD_W = 1080;
    const CARD_H = 1920;
    const canvas = document.createElement("canvas");
    canvas.width = CARD_W;
    canvas.height = CARD_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // 1. Arkaplan gradient
    const grad = ctx.createLinearGradient(0, 0, 0, CARD_H);
    switch (kaiLevel) {
      case 1:
        grad.addColorStop(0, "#ea580c");
        grad.addColorStop(0.5, "#b45309");
        grad.addColorStop(1, "#7f1d1d");
        break;
      case 2:
        grad.addColorStop(0, "#d97706");
        grad.addColorStop(0.5, "#9a3412");
        grad.addColorStop(1, "#7f1d1d");
        break;
      case 3:
        grad.addColorStop(0, "#6b21a8");
        grad.addColorStop(0.5, "#4c1d95");
        grad.addColorStop(1, "#1e1b4b");
        break;
      case 4:
        grad.addColorStop(0, "#581c87");
        grad.addColorStop(0.5, "#86198f");
        grad.addColorStop(1, "#831843");
        break;
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CARD_W, CARD_H);

    // 2. Mor/sarı overlay
    const overlayGrad = ctx.createLinearGradient(0, 0, 0, CARD_H);
    overlayGrad.addColorStop(0, withAlpha(theme.flameColor2, 0.1));
    overlayGrad.addColorStop(0.3, "transparent");
    overlayGrad.addColorStop(0.5, "rgba(168,85,247,0.15)");
    overlayGrad.addColorStop(0.7, "rgba(168,85,247,0.3)");
    overlayGrad.addColorStop(0.85, "rgba(124,58,237,0.45)");
    overlayGrad.addColorStop(1, "rgba(88,28,135,0.5)");
    ctx.fillStyle = overlayGrad;
    ctx.fillRect(0, 0, CARD_W, CARD_H);

    // 3. Glow efektleri
    const glowColors = [
      { x: 0.3, y: 0.2, color: theme.glowIntense, r: 0.6 },
      { x: 0.7, y: 0.8, color: theme.glow, r: 0.5 },
      { x: 0.5, y: 0.5, color: "rgba(168,85,247,0.5)", r: 0.6 },
      { x: 0.2, y: 0.8, color: "rgba(124,58,237,0.3)", r: 0.5 },
      { x: 0.8, y: 0.2, color: "rgba(88,28,135,0.25)", r: 0.5 },
    ];
    glowColors.forEach((g) => {
      const grd = ctx.createRadialGradient(
        g.x * CARD_W, g.y * CARD_H, 0,
        g.x * CARD_W, g.y * CARD_H, g.r * CARD_W
      );
      grd.addColorStop(0, g.color);
      grd.addColorStop(1, "transparent");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, CARD_W, CARD_H);
    });

    // 4. Fitness ikonları (emoji) - canvas fillText ile render
    ctx.globalAlpha = 0.4;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    FITNESS_ICONS.forEach((icon, i) => {
      const pos = ICON_POSITIONS[i % ICON_POSITIONS.length];
      const size = 28 + (i % 3) * 8;
      ctx.font = `${size}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
      ctx.fillText(icon, (pos.x / 100) * CARD_W, (pos.y / 100) * CARD_H);
    });
    ctx.globalAlpha = 1;

    // 5. Üst kısım - Kaify logosu ve Level
    ctx.font = "bold 28px sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = theme.glow;
    ctx.shadowBlur = 10;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("Kaify", 60, 80);

    // Level badge
    ctx.shadowBlur = 0;
    const badgeX = CARD_W - 60;
    const badgeY = 70;
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillStyle = theme.flameColor2;
    ctx.fillText(`Lv.${kaiLevel}`, badgeX, badgeY);

    // 6. Orta kısım - Streak sayısı
    const centerX = CARD_W / 2;
    const centerY = CARD_H * 0.35;

    // Büyük glow
    const bigGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 400);
    bigGlow.addColorStop(0, theme.glowIntense);
    bigGlow.addColorStop(0.4, withAlpha(theme.glow, 0.4));
    bigGlow.addColorStop(1, "transparent");
    ctx.fillStyle = bigGlow;
    ctx.fillRect(0, 0, CARD_W, CARD_H);

    // Streak sayısı
    ctx.shadowColor = theme.glow;
    ctx.shadowBlur = 60;
    ctx.font = "bold 200px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(String(streak), centerX + 60, centerY - 20);

    // "DAILY" yazısı
    ctx.shadowBlur = 30;
    ctx.font = "bold 36px sans-serif";
    ctx.fillStyle = theme.flameColor2;
    ctx.fillText(t("streak.daily").toUpperCase(), centerX, centerY + 80);

    // 7. Kai Avatar
    const avatarSrc = KAI_LEVEL_AVATARS[kaiLevel];
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const imgEl = new window.Image();
        imgEl.crossOrigin = "anonymous";
        imgEl.onload = () => resolve(imgEl);
        imgEl.onerror = () => reject(new Error("Avatar load failed"));
        imgEl.src = avatarSrc;
      });
      const avatarSize = 280;
      const avatarX = centerX - avatarSize / 2;
      const avatarY = centerY + 180;
      ctx.shadowBlur = 60;
      ctx.shadowColor = theme.glow;
      ctx.drawImage(img, avatarX, avatarY, avatarSize, avatarSize);
    } catch (_e) {
      // Avatar yüklenemezse sessizce geç
    }
    ctx.shadowBlur = 0;

    // 8. Alt kısım - Motivasyon mesajı
    ctx.font = "italic bold 32px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.shadowColor = theme.glow;
    ctx.shadowBlur = 15;
    ctx.fillStyle = theme.flameColor2;
    ctx.fillText(`"${message}"`, centerX, CARD_H - 200);

    // 9. KAIFY logosu (alt) - gradient text
    ctx.shadowBlur = 0;
    const kaifyGrad = ctx.createLinearGradient(centerX - 150, 0, centerX + 150, 0);
    kaifyGrad.addColorStop(0, "#c084fc");
    kaifyGrad.addColorStop(0.4, "#a855f7");
    kaifyGrad.addColorStop(0.7, "#7c3aed");
    kaifyGrad.addColorStop(1, "#e9d5ff");
    ctx.fillStyle = kaifyGrad;
    ctx.font = "bold 64px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText("KAIFY", centerX, CARD_H - 120);

    // 10. kaify.app
    ctx.fillStyle = withAlpha(theme.flameColor2, 0.5);
    ctx.font = "bold 22px sans-serif";
    ctx.fillText("kaify.app", centerX, CARD_H - 70);

    // 11. Alt gradient overlay
    const bottomGrad = ctx.createLinearGradient(0, CARD_H - 200, 0, CARD_H);
    bottomGrad.addColorStop(0, "transparent");
    bottomGrad.addColorStop(1, withAlpha(theme.glowIntense, 0.19));
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(0, CARD_H - 200, CARD_W, 200);

    return canvas;
  }, [streak, kaiLevel, theme, t, message]);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      const canvas = await captureCard();
      if (!canvas) return;
      const link = document.createElement("a");
      link.download = `kaify-streak-${streak}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Failed to generate card:", err);
    }
    setDownloading(false);
  }, [streak, captureCard]);

  const handleShare = useCallback(async () => {
    setDownloading(true);
    try {
      const canvas = await captureCard();
      if (!canvas) return;
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!blob) return;

      if (navigator.share) {
        const file = new File([blob], `kaify-streak-${streak}.png`, { type: "image/png" });
        await navigator.share({
          title: `Kaify - ${streak} Day Streak!`,
          files: [file],
        });
      } else {
        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": blob,
          }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error("Failed to share:", err);
    }
    setDownloading(false);
  }, [streak, captureCard]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative flex flex-col items-center gap-4 max-w-sm w-full">
        {/* Kapat butonu */}
        <button
          onClick={onClose}
          className="self-end flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-zinc-400 transition hover:bg-white/20 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Kart */}
        <div
          ref={cardRef}
          data-streak-card="true"
          className="relative w-full aspect-[9/16] rounded-3xl overflow-hidden shadow-2xl"
          style={{
            background: `linear-gradient(160deg, ${theme.gradient})`,
          }}
        >
          {/* ===== ARKAPLAN EFEKTLERİ ===== */}

          {/* Sarı→Mor renk geçişi - üstte hafif sarı, altta yoğun mor */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, 
                ${theme.flameColor2}12 0%, 
                ${theme.flameColor}08 15%, 
                transparent 30%, 
                rgba(168,85,247,0.15) 50%, 
                rgba(168,85,247,0.3) 70%, 
                rgba(124,58,237,0.45) 85%, 
                rgba(88,28,135,0.5) 100%)`,
            }}
          />

          {/* Ana glow - mor ağırlıklı */}
          <div
            className="absolute inset-0 opacity-70"
            style={{
              background: `radial-gradient(circle at 30% 20%, ${theme.glowIntense}, transparent 60%),
                          radial-gradient(circle at 70% 80%, ${theme.glow}, transparent 50%),
                          radial-gradient(circle at 50% 50%, rgba(168,85,247,0.5), transparent 60%),
                          radial-gradient(circle at 20% 80%, rgba(124,58,237,0.3), transparent 50%),
                          radial-gradient(circle at 80% 20%, rgba(88,28,135,0.25), transparent 50%)`,
            }}
          />

          {/* Fitness ikonları - arka planda belirgin */}
          {mounted && [...Array(12)].map((_, i) => (
            <FitnessIcon key={`fitness-${i}`} index={i} theme={theme} />
          ))}

          {/* Hareketli floating orb'lar */}
          {mounted && [...Array(6)].map((_, i) => (
            <FloatingOrb key={`orb-${i}`} index={i} theme={theme} />
          ))}

          {/* Işık halkaları */}
          {mounted && [...Array(4)].map((_, i) => (
            <GlowRing key={`ring-${i}`} index={i} theme={theme} />
          ))}

          {/* Yıldız parıltıları */}
          {mounted && [...Array(12)].map((_, i) => (
            <SparkleStar key={`star-${i}`} index={i} theme={theme} />
          ))}

          {/* Yükselen partiküller */}
          {mounted && [...Array(20)].map((_, i) => (
            <Particle key={`particle-${i}`} index={i} theme={theme} />
          ))}

          {/* Dönen geometrik şekiller */}
          {mounted && [...Array(8)].map((_, i) => (
            <RotatingShape key={`shape-${i}`} index={i} theme={theme} />
          ))}

          {/* Işık tarama çizgileri */}
          {mounted && [...Array(3)].map((_, i) => (
            <ScanLine key={`scan-${i}`} index={i} theme={theme} />
          ))}

          {/* Yükselen baloncuklar */}
          {mounted && [...Array(10)].map((_, i) => (
            <Bubble key={`bubble-${i}`} index={i} theme={theme} />
          ))}

          {/* Enerji patlaması */}
          <EnergyBurst theme={theme} />

          {/* Işın ışınları */}
          <LightRays theme={theme} />

          {/* ===== İÇERİK ===== */}

          {/* Üst kısım - Kaify logosu */}
          <div className="absolute top-6 left-6 right-6 flex items-start justify-between z-10">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Image
                  src="/kaify-logo.png"
                  alt="Kaify"
                  width={32}
                  height={32}
                  className="rounded-lg"
                  style={{ filter: `drop-shadow(0 0 8px ${theme.glow})` }}
                />
                <span
                  className="text-xl font-bold text-white"
                  style={{ textShadow: `0 0 20px ${theme.glow}` }}
                >
                  Kaify
                </span>
              </div>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-xs font-bold ${theme.badgeBg} ${theme.badgeText}`}
              style={{ border: `1px solid ${theme.flameColor2}40` }}
            >
              Lv.{kaiLevel}
            </div>
          </div>

          {/* Orta kısım - Streak sayısı */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
            {/* Büyük glow - sayının arkasında */}
            <div
              className="absolute w-96 h-96 rounded-full blur-3xl"
              style={{
                background: `radial-gradient(circle, ${theme.glowIntense}, transparent 70%)`,
                opacity: 0.5,
              }}
            />

            {/* Streak sayısı */}
            <div className="flex items-center gap-4">
              <Flame
                className="w-16 h-16"
                style={{
                  color: theme.flameColor,
                  filter: `drop-shadow(0 0 20px ${theme.flameColor}) drop-shadow(0 0 40px ${theme.glow})`,
                  animation: "streakFlamePulse 1.5s ease-in-out infinite",
                }}
              />
              <span
                className="text-[180px] font-black leading-none tracking-tighter"
                style={{
                  color: "#ffffff",
                  textShadow: `0 0 40px ${theme.glow}, 0 0 80px ${theme.glow}, 0 0 120px ${theme.glowIntense}`,
                  WebkitTextStroke: `2px ${theme.flameColor2}40`,
                }}
              >
                {streak}
              </span>
            </div>

            {/* DAILY yazısı */}
            <span
              className="text-3xl font-bold mt-4 tracking-[0.3em]"
              style={{
                color: theme.flameColor2,
                textShadow: `0 0 20px ${theme.glow}, 0 0 40px ${theme.glow}`,
              }}
            >
              {t("streak.daily").toUpperCase()}
            </span>
          </div>

          {/* Kai Avatar */}
          <div className="absolute bottom-44 left-1/2 -translate-x-1/2 z-10">
            <div
              className="relative"
              style={{
                filter: `drop-shadow(0 0 30px ${theme.glow}) drop-shadow(0 0 60px ${theme.glowIntense})`,
              }}
            >
              <Image
                src={KAI_LEVEL_AVATARS[kaiLevel]}
                alt="Kai"
                width={200}
                height={200}
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Alt kısım - Motivasyon mesajı */}
          <div className="absolute bottom-28 left-6 right-6 text-center z-10">
            <p
              className="text-lg italic font-semibold"
              style={{
                color: theme.flameColor2,
                textShadow: `0 0 15px ${theme.glow}`,
              }}
            >
              &ldquo;{message}&rdquo;
            </p>
          </div>

          {/* KAIFY logosu (alt) */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10">
            <span
              className="text-5xl font-black tracking-wider"
              style={{
                background: "linear-gradient(135deg, #c084fc, #a855f7, #7c3aed, #e9d5ff)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: "drop-shadow(0 0 20px rgba(168,85,247,0.5))",
              }}
            >
              KAI FY
            </span>
          </div>

          {/* kaify.app */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
            <span
              className="text-sm font-bold tracking-widest"
              style={{
                color: theme.flameColor2,
                opacity: 0.5,
              }}
            >
              kaify.app
            </span>
          </div>

          {/* Alt gradient overlay */}
          <div
            className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
            style={{
              background: `linear-gradient(to top, ${theme.glowIntense}30, transparent)`,
            }}
          />
        </div>

        {/* Butonlar */}
        <div className="flex gap-3 w-full">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-purple-500 hover:to-violet-500 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {downloading ? t("common.loading") : t("streak.download")}
          </button>
          <button
            onClick={handleShare}
            disabled={downloading}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
          >
            <Share2 className="h-4 w-4" />
            {copied ? t("common.copied") : t("streak.share")}
          </button>
        </div>
      </div>
    </div>
  );
}
