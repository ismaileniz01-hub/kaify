"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

/** next/image with a true load-driven fade, not a mount-time animation. */
export function PremiumImage({
  className = "",
  onLoad,
  onError,
  src,
  alt,
  priority,
  ...props
}: ImageProps) {
  const [loadedSrc, setLoadedSrc] = useState<ImageProps["src"] | null>(
    priority ? src : null,
  );
  const loaded = loadedSrc === src;

  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      priority={priority}
      data-loaded={loaded}
      className={`premium-image ${className}`}
      onLoad={(event) => {
        setLoadedSrc(src);
        onLoad?.(event);
      }}
      onError={(event) => {
        setLoadedSrc(src);
        onError?.(event);
      }}
    />
  );
}
