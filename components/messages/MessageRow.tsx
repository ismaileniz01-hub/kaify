import Link from "next/link";
import type { CSSProperties } from "react";
import { ChevronRight } from "lucide-react";
import { publicAssetUrl } from "@/lib/public-asset-url";
import { PremiumImage } from "@/components/ui/PremiumImage";
import { coachAvatarTransitionName } from "@/lib/motion/shared-element";

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
  /** Coach id for shared-element avatar View Transition */
  coachId?: string;
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
  coachId,
}: MessageRowProps) {
  const delay = Math.min(index + 3, 8);
  const glowColor = hexToRgba(color, 0.2);
  const transitionStyle = coachId
    ? ({
        boxShadow: `0 8px 20px ${glowColor}`,
        viewTransitionName: coachAvatarTransitionName(coachId),
      } as CSSProperties)
    : ({ boxShadow: `0 8px 20px ${glowColor}` } as CSSProperties);

  return (
    <Link
      href={href}
      className={`message-row animate-in animate-in--${delay} group flex min-h-[76px] items-center gap-3 rounded-2xl px-3.5 py-3`}
      style={{ "--message-accent": color } as CSSProperties}
    >
      <div
        className="contact-avatar relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/80"
        style={transitionStyle}
      >
        <PremiumImage
          src={publicAssetUrl(avatarSrc)}
          alt={name}
          width={48}
          height={48}
          priority
          className="h-full w-full object-contain p-0.5"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-baseline gap-2">
          <p className="truncate text-sm font-semibold text-white">{name}</p>
          <span className="type-caption truncate type-muted">{role}</span>
        </div>
        <p className="type-body mt-0.5 truncate text-xs text-zinc-400">{preview}</p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="type-caption type-muted">{time}</span>
        {badge !== undefined && badge > 0 && (
          <span
            className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white shadow-sm"
            style={{ background: hexToRgba(color, 0.8) }}
          >
            {badge}
          </span>
        )}
        {tag && (
          <span className="type-caption rounded-full bg-white/5 px-1.5 py-0.5 type-muted">
            {tag}
          </span>
        )}
        <ChevronRight
          className="mt-0.5 h-3.5 w-3.5 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-300 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
          aria-hidden
        />
      </div>
    </Link>
  );
}
