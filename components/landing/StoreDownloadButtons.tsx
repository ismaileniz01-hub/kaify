"use client";

import { useEffect, useState } from "react";
import {
  APP_STORE_URL,
  PLAY_STORE_URL,
  detectMobileStore,
  type MobileStore,
} from "@/lib/marketing/store-links";

type Props = {
  /** Primary CTA style; secondary buttons stay ghost. */
  size?: "md" | "lg";
  className?: string;
};

export function StoreDownloadButtons({ size = "lg", className = "" }: Props) {
  const [store, setStore] = useState<MobileStore>("unknown");

  useEffect(() => {
    setStore(detectMobileStore());
  }, []);

  const btn =
    size === "lg"
      ? "landing-btn landing-btn--lg"
      : "landing-btn";

  if (store === "ios") {
    return (
      <div className={`flex flex-wrap items-center justify-center gap-4 ${className}`}>
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`${btn} landing-btn--primary`}
        >
          Download for Free
        </a>
      </div>
    );
  }

  if (store === "android") {
    return (
      <div className={`flex flex-wrap items-center justify-center gap-4 ${className}`}>
        <a
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`${btn} landing-btn--primary`}
        >
          Download for Free
        </a>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center gap-4 sm:flex-row ${className}`}>
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`${btn} landing-btn--primary`}
      >
        Download for Free · App Store
      </a>
      <a
        href={PLAY_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`${btn} landing-btn--ghost`}
      >
        Download for Free · Google Play
      </a>
    </div>
  );
}
