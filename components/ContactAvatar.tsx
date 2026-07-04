import Image from "next/image";
import type { AuraColor } from "@/lib/kai-context";
import { AuraEffectLayer } from "@/components/AuraEffectLayer";
import { getAuraVisual, resolveAvatarEffect, type AvatarEffect } from "@/lib/aura-effects";

export type { AvatarEffect };

type ContactAvatarProps = {
  src: string;
  alt: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  pulse?: boolean;
  effect?: AvatarEffect;
  auraColor?: AuraColor;
  className?: string;
};

const sizes = {
  xs: { box: "h-8 w-8", img: 32, scale: "sm" as const },
  sm: { box: "h-11 w-11", img: 44, scale: "sm" as const },
  md: { box: "h-14 w-14", img: 52, scale: "md" as const },
  lg: { box: "h-20 w-20", img: 76, scale: "lg" as const },
  xl: { box: "h-28 w-28", img: 104, scale: "lg" as const },
};

export function ContactAvatar({
  src,
  alt,
  size = "md",
  pulse = false,
  effect,
  auraColor = "default",
  className = "",
}: ContactAvatarProps) {
  const { box, img, scale } = sizes[size];
  const visual = getAuraVisual(auraColor);
  const resolvedEffect = effect ?? resolveAvatarEffect(auraColor);

  return (
    <div className={`relative ${className}`}>
      {pulse && (
        <span
          className="absolute -inset-2 animate-ping rounded-full bg-purple-500/20"
          aria-hidden
        />
      )}
      <div className={`relative ${box} flex items-center justify-center`}>
        <AuraEffectLayer effect={resolvedEffect} config={visual} scale={scale} />
        <Image
          src={src}
          alt={alt}
          width={img}
          height={img}
          unoptimized
          className="relative z-10 h-full w-full object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
        />
      </div>
    </div>
  );
}
