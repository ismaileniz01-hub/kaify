"use client";

import { hasAnalyticsConsent } from "@/lib/legal/cookie-consent";
import type { ProductEventName } from "@/lib/events/product-catalog";

function installId(): string {
  const key = "kaify_install_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const next = crypto.randomUUID();
  localStorage.setItem(key, next);
  return next;
}

export function postClientProductEvent(input: {
  name: ProductEventName;
  properties?: Record<string, string | number | boolean>;
  requireConsent?: boolean;
}): void {
  if (typeof window === "undefined") return;
  if (input.requireConsent && !hasAnalyticsConsent()) return;
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (hasAnalyticsConsent()) headers["x-kaify-analytics-consent"] = "1";
  void fetch("/api/events", {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: input.name,
      installId: installId(),
      platform: "web",
      properties: input.properties,
    }),
  }).catch(() => undefined);
}
