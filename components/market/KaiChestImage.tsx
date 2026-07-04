"use client";

import Image from "next/image";
import { useLang } from "@/lib/lang-context";

type Props = {
  size?: number;
  className?: string;
  pulse?: boolean;
};

/** Static Kai chest icon (green-screen removed PNG). */
export function KaiChestImage({ size = 72, className = "", pulse = false }: Props) {
  const { t } = useLang();

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {pulse && (
        <div className="absolute inset-0 animate-pulse rounded-2xl bg-amber-400/10" />
      )}
      <Image
        src="/assets/kai-chest.png"
        alt={t("market.kai_chest_alt")}
        width={size}
        height={size}
        className="relative h-full w-full object-contain drop-shadow-[0_4px_16px_rgba(124,58,237,0.45)]"
        priority
      />
    </div>
  );
}
