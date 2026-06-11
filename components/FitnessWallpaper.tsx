import type { LucideIcon } from "lucide-react";
import {
  Dumbbell,
  Flame,
  Footprints,
  HeartPulse,
  Timer,
  Weight,
} from "lucide-react";

const ICON_SET: LucideIcon[] = [
  Dumbbell,
  HeartPulse,
  Flame,
  Footprints,
  Timer,
  Weight,
];

type FitnessIconPlacement = {
  Icon: LucideIcon;
  top: string;
  left: string;
  size: number;
  rotate: number;
  opacity: number;
};

/** Yoğun fitness deseni — çoğaltılmış ve belirgin ikonlar */
function buildFitnessIcons(): FitnessIconPlacement[] {
  const items: FitnessIconPlacement[] = [];
  const cols = 5;
  const rows = 9;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const Icon = ICON_SET[(row * cols + col) % ICON_SET.length];
      const jitterX = (row % 2) * 4;
      const jitterY = (col % 2) * 3;
      const left = col * (100 / cols) + jitterX + 2;
      const top = row * (100 / rows) + jitterY + 1;
      const size = 22 + ((row + col) % 4) * 6;
      const rotate = -28 + ((row * 17 + col * 23) % 56);
      const opacity = 0.32 + ((row + col) % 3) * 0.08;

      items.push({
        Icon,
        top: `${top}%`,
        left: `${left}%`,
        size,
        rotate,
        opacity: Math.min(opacity, 0.48),
      });
    }
  }

  // Ekstra dağınık ikonlar (köşe ve kenar dolgusu)
  const extras: Omit<FitnessIconPlacement, "Icon">[] = [
    { top: "3%", left: "45%", size: 34, rotate: 12, opacity: 0.4 },
    { top: "15%", left: "3%", size: 30, rotate: -18, opacity: 0.38 },
    { top: "15%", left: "88%", size: 28, rotate: 22, opacity: 0.36 },
    { top: "35%", left: "72%", size: 32, rotate: -8, opacity: 0.42 },
    { top: "50%", left: "5%", size: 36, rotate: 15, opacity: 0.4 },
    { top: "65%", left: "48%", size: 26, rotate: -25, opacity: 0.35 },
    { top: "78%", left: "18%", size: 34, rotate: 8, opacity: 0.41 },
    { top: "78%", left: "78%", size: 30, rotate: -14, opacity: 0.39 },
    { top: "92%", left: "42%", size: 28, rotate: 20, opacity: 0.37 },
    { top: "42%", left: "28%", size: 24, rotate: -30, opacity: 0.34 },
    { top: "58%", left: "62%", size: 38, rotate: 6, opacity: 0.44 },
    { top: "8%", left: "68%", size: 26, rotate: -12, opacity: 0.36 },
    { top: "88%", left: "8%", size: 32, rotate: 18, opacity: 0.4 },
    { top: "25%", left: "58%", size: 30, rotate: -22, opacity: 0.38 },
    { top: "72%", left: "92%", size: 26, rotate: 10, opacity: 0.35 },
  ];

  extras.forEach((e, i) => {
    items.push({ ...e, Icon: ICON_SET[i % ICON_SET.length] });
  });

  return items;
}

const FITNESS_ICONS = buildFitnessIcons();

function EmbossedFitnessIcon({
  Icon,
  size,
  rotate,
  opacity,
}: Omit<FitnessIconPlacement, "top" | "left">) {
  return (
    <Icon
      size={size}
      strokeWidth={2}
      className="fitness-emboss"
      style={{
        transform: `rotate(${rotate}deg)`,
        opacity,
      }}
      aria-hidden
    />
  );
}

type FitnessWallpaperProps = {
  /** Karşılama ekranında metin okunabilirliği için daha hafif vignette */
  softVignette?: boolean;
};

export function FitnessWallpaper({ softVignette = false }: FitnessWallpaperProps) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(165deg, #2d0a5c 0%, #4a148c 38%, #3b0764 72%, #1a0530 100%)",
        }}
      />

      {FITNESS_ICONS.map((item, i) => (
        <div
          key={i}
          className="absolute"
          style={{ top: item.top, left: item.left }}
        >
          <EmbossedFitnessIcon
            Icon={item.Icon}
            size={item.size}
            rotate={item.rotate}
            opacity={item.opacity}
          />
        </div>
      ))}

      <div
        className="absolute inset-0"
        style={{
          background: softVignette
            ? "radial-gradient(ellipse 80% 60% at 50% 40%, transparent 0%, rgba(12, 4, 28, 0.2) 100%)"
            : "radial-gradient(ellipse 75% 55% at 50% 38%, transparent 0%, rgba(12, 4, 28, 0.35) 100%)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          height: softVignette ? "40%" : "50%",
          background: softVignette
            ? "linear-gradient(to top, rgba(8, 3, 18, 0.55) 0%, transparent 100%)"
            : "linear-gradient(to top, rgba(8, 3, 18, 0.75) 0%, transparent 100%)",
        }}
      />
    </div>
  );
}
