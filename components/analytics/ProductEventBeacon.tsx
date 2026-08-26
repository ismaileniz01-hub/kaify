"use client";

import { useEffect } from "react";
import { postClientProductEvent } from "@/lib/events/client-beacon";

export function ProductEventBeacon({
  name,
  page,
}: {
  name: "acquisition.landing_viewed" | "acquisition.pricing_viewed";
  page: "landing" | "pricing";
}) {
  useEffect(() => {
    postClientProductEvent({
      name,
      requireConsent: true,
      properties: { page, locale: document.documentElement.lang || "en" },
    });
    const params = new URLSearchParams(window.location.search);
    const source = params.get("utm_source")?.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
    if (source) {
      postClientProductEvent({
        name: "acquisition.utm_captured",
        requireConsent: true,
        properties: {
          source,
          medium: (params.get("utm_medium") ?? "unknown")
            .replace(/[^a-zA-Z0-9_-]/g, "")
            .slice(0, 32),
          campaign: (params.get("utm_campaign") ?? "unknown")
            .replace(/[^a-zA-Z0-9_-]/g, "")
            .slice(0, 32),
        },
      });
    }
  }, [name, page]);
  return null;
}
