"use client";

import Image from "next/image";

const CUSTOM_FLAG_URLS: Record<string, string> = {
  ct: "/flag-northern-cyprus.svg",
};

/**
 * Country flag via next/image (flagcdn) or local custom SVG.
 * Empty alt — decorative next to country name text.
 */
export function FlagImage({
  flagCode,
  size = 40,
  className = "rounded-full object-cover shadow-lg",
}: {
  flagCode: string;
  size?: number;
  className?: string;
}) {
  const code = flagCode.toLowerCase();
  const isCustom = code in CUSTOM_FLAG_URLS;
  const height = Math.max(1, Math.round(size * 0.6));
  const src = isCustom
    ? CUSTOM_FLAG_URLS[code]
    : `https://flagcdn.com/h80/${code}.png`;

  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={height}
      className={className}
      style={code === "tr" ? { objectPosition: "35% center" } : undefined}
      unoptimized={isCustom}
    />
  );
}
