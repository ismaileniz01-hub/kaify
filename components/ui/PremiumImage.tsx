"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

const FALLBACK_SRC = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#27272a"/><circle cx="32" cy="26" r="10" fill="#a1a1aa"/><path d="M16 54c2.2-9 8.8-14 16-14s13.8 5 16 14" fill="#a1a1aa"/></svg>`,
)}`;

/** next/image with a true load-driven fade, not a mount-time animation. */
export function PremiumImage({
  className = "",
  onLoad,
  onError,
  src,
  alt,
  priority,
  style,
  unoptimized,
  width,
  height,
  ...props
}: ImageProps) {
  const [loadedSrc, setLoadedSrc] = useState<ImageProps["src"] | null>(
    priority ? src : null,
  );
  const [failed, setFailed] = useState(false);
  const resolved = failed ? FALLBACK_SRC : src;
  const loaded = !failed && loadedSrc === src;
  const ratio =
    typeof width === "number" && typeof height === "number"
      ? `${width} / ${height}`
      : undefined;

  return (
    <Image
      {...props}
      src={resolved}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      unoptimized={failed || unoptimized || (typeof resolved === "string" && resolved.startsWith("data:"))}
      data-loaded={loaded}
      data-fallback={failed ? "true" : undefined}
      style={{ aspectRatio: ratio, ...style }}
      className={`premium-image ${className}`}
      onLoad={(event) => {
        setLoadedSrc(resolved);
        onLoad?.(event);
      }}
      onError={(event) => {
        if (!failed) setFailed(true);
        setLoadedSrc(resolved);
        onError?.(event);
      }}
    />
  );
}
