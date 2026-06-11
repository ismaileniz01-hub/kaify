import Image from "next/image";
import Link from "next/link";

type MessageRowProps = {
  name: string;
  role: string;
  preview: string;
  time: string;
  avatarSrc: string;
  badge?: number;
  tag?: string;
  href: string;
  index?: number;
  /** Neon border rengi (Tailwind veya hex) */
  color?: string;
  /** Glow rengi (rgba) */
  glow?: string;
};

const COLORS: Record<string, { border: string; glow: string; bg: string }> = {
  purple: {
    border: "border-purple-500/60",
    glow: "rgba(168, 85, 247, 0.2)",
    bg: "#1a0a2e",
  },
  blue: {
    border: "border-blue-500/60",
    glow: "rgba(59, 130, 246, 0.2)",
    bg: "#0a162e",
  },
  green: {
    border: "border-emerald-500/60",
    glow: "rgba(16, 185, 129, 0.2)",
    bg: "#0a1a12",
  },
  orange: {
    border: "border-orange-500/60",
    glow: "rgba(249, 115, 22, 0.2)",
    bg: "#1a0e0a",
  },
  pink: {
    border: "border-pink-500/60",
    glow: "rgba(236, 72, 153, 0.2)",
    bg: "#1a0a14",
  },
  gold: {
    border: "border-amber-500/60",
    glow: "rgba(251, 191, 36, 0.2)",
    bg: "#1a140a",
  },
  red: {
    border: "border-red-500/60",
    glow: "rgba(239, 68, 68, 0.2)",
    bg: "#1a0a0a",
  },
};

export function MessageRow({
  name,
  role,
  preview,
  time,
  avatarSrc,
  badge,
  tag,
  href,
  index = 0,
  color = "purple",
  glow,
}: MessageRowProps) {
  const delay = Math.min(index + 3, 8);
  const c = COLORS[color] ?? COLORS.purple;
  const glowColor = glow ?? c.glow;

  return (
    <Link
      href={href}
      className={`animate-in animate-in--${delay} group flex items-center gap-3 rounded-xl border-2 ${c.border} px-3.5 py-3.5 shadow-lg transition hover:brightness-110 active:scale-[0.99]`}


      style={{
        background: c.bg,
        boxShadow: `0 0 10px ${glowColor}, inset 0 0 6px ${glowColor.replace("0.2", "0.06")}`,
        animation: `color-shift 4s ease-in-out infinite`,
      }}
    >
      <div
        className="relative h-13 w-13 shrink-0 overflow-hidden rounded-full bg-zinc-900/80"
        style={{ boxShadow: `0 0 8px ${glowColor}` }}
      >
        <Image
          src={avatarSrc}
          alt={name}
          width={52}
          height={52}
          className="h-full w-full object-contain p-0.5"
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-white">
          {name} — {role}
        </p>
        <p className="truncate text-sm text-zinc-500">{preview}</p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="text-xs text-zinc-500">{time}</span>
        {badge !== undefined && (
          <span
            className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold text-white"
            style={{ background: glowColor.replace("0.2", "0.8") }}
          >
            {badge}
          </span>
        )}
        {tag && (
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-400">
            {tag}
          </span>
        )}
      </div>
    </Link>
  );
}
