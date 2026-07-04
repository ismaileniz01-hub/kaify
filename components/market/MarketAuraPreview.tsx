import Image from "next/image";
import { AuraEffectLayer } from "@/components/AuraEffectLayer";
import { getAuraVisual, resolveAvatarEffect } from "@/lib/aura-effects";
import type { AuraColor } from "@/lib/kai-context";

/** Live Kai + aura preview for market cards. */
export function MarketAuraPreview({ auraId }: { auraId: AuraColor }) {
  const visual = getAuraVisual(auraId);
  const effect = resolveAvatarEffect(auraId);

  return (
    <div className="relative flex h-24 w-24 items-center justify-center">
      <AuraEffectLayer effect={effect} config={visual} scale="lg" />
      <Image
        src="/kai-mascot-v2.png"
        alt=""
        width={56}
        height={56}
        unoptimized
        className="relative z-10 h-14 w-14 object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
      />
    </div>
  );
}
