import type { CSSProperties } from "react";
import type { AuraColor } from "@/lib/kai-context";
import type { ContactId } from "@/lib/contacts";
import { AuraEffectLayer } from "@/components/AuraEffectLayer";
import { getAuraVisual, resolveAvatarEffect, type AvatarEffect } from "@/lib/aura-effects";
import { publicAssetUrl } from "@/lib/public-asset-url";
import { PremiumImage } from "@/components/ui/PremiumImage";

export type { AvatarEffect };

type ContactAvatarProps = {
  src: string;
  alt: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  pulse?: boolean;
  effect?: AvatarEffect;
  auraColor?: AuraColor;
  className?: string;
  /** Shared-element View Transition name (messages → chat). */
  transitionName?: string;
  presence?: "idle" | "typing" | "sent";
  coachId?: ContactId;
};

const sizes = {
  xs: { box: "h-8 w-8", img: 32, scale: "sm" as const, sizesAttr: "32px" },
  sm: { box: "h-11 w-11", img: 44, scale: "sm" as const, sizesAttr: "44px" },
  md: { box: "h-14 w-14", img: 56, scale: "md" as const, sizesAttr: "56px" },
  lg: { box: "h-20 w-20", img: 80, scale: "lg" as const, sizesAttr: "80px" },
  xl: { box: "h-28 w-28", img: 112, scale: "lg" as const, sizesAttr: "112px" },
};

export function ContactAvatar({
  src,
  alt,
  size = "md",
  pulse = false,
  effect,
  auraColor = "default",
  className = "",
  transitionName,
  presence = "idle",
  coachId,
}: ContactAvatarProps) {
  const { box, img, scale, sizesAttr } = sizes[size];
  const visual = getAuraVisual(auraColor);
  const resolvedEffect = effect ?? resolveAvatarEffect(auraColor);
  // Data URLs / blob previews cannot go through the optimizer.
  const needsUnoptimized =
    src.startsWith("data:") || src.startsWith("blob:");
  const transitionStyle = transitionName
    ? ({ viewTransitionName: transitionName } as CSSProperties)
    : undefined;

  return (
    <div
      className={`relative ${className}${
        presence === "typing" && coachId
          ? ` chat-presence-typing chat-presence-typing--${coachId}`
          : ""
      }`}
      style={transitionStyle}
    >
      {pulse && (
        <span
          className="absolute -inset-2 animate-ping rounded-full bg-purple-500/20"
          aria-hidden
        />
      )}
      <div className={`relative ${box} flex items-center justify-center`}>
        <AuraEffectLayer effect={resolvedEffect} config={visual} scale={scale} />
        <PremiumImage
          src={publicAssetUrl(src)}
          alt={alt}
          width={img}
          height={img}
          sizes={sizesAttr}
          unoptimized={needsUnoptimized}
          className="relative z-10 h-full w-full object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
        />
      </div>
    </div>
  );
}
