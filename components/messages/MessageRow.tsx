import Image from "next/image";
import Link from "next/link";
import { publicAssetUrl } from "@/lib/public-asset-url";

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
  /** Hex renk kodu (örn: #ef4444) */
  color?: string;
};

/** Hex rengi rgba'ya çevir */
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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
  color = "#a855f7",
}: MessageRowProps) {
  const delay = Math.min(index + 3, 8);
  const glowColor = hexToRgba(color, 0.2);
  const bgColor = hexToRgba(color, 0.06);

  return (
    <Link
      href={href}
      className={`animate-in animate-in--${delay} group flex items-center gap-3 rounded-xl border-2 px-3.5 py-3.5 shadow-lg transition hover:brightness-110 active:scale-[0.99]`}
      style={{
        borderColor: hexToRgba(color, 0.6),
        background: bgColor,
        boxShadow: `0 0 10px ${glowColor}, inset 0 0 6px ${hexToRgba(color, 0.06)}`,
        animation: `color-shift 4s ease-in-out infinite`,
      }}
    >
      <div
        className="relative h-[52px] w-[52px] shrink-0 overflow-hidden rounded-full bg-zinc-900/80"
        style={{ boxShadow: `0 0 8px ${glowColor}` }}
      >
        <Image
          src={publicAssetUrl(avatarSrc)}
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
            style={{ background: hexToRgba(color, 0.8) }}
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
