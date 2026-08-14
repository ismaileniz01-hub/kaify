"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Script from "next/script";
import { hasAnalyticsConsent } from "@/lib/legal/cookie-consent";
import { useNativeApp } from "@/lib/native/platform";

const Analytics = dynamic(
  () => import("@vercel/analytics/next").then((m) => m.Analytics),
  { ssr: false },
);
const SpeedInsights = dynamic(
  () => import("@vercel/speed-insights/next").then((m) => m.SpeedInsights),
  { ssr: false },
);

type OptionalAnalyticsProps = {
  nonce?: string;
};

/** Loads marketing/analytics only after explicit cookie consent. */
export function OptionalAnalytics({ nonce }: OptionalAnalyticsProps) {
  const [allowed, setAllowed] = useState(false);
  const isNativeApp = useNativeApp();

  useEffect(() => {
    if (isNativeApp) return;
    setAllowed(hasAnalyticsConsent());

    const onConsent = () => setAllowed(hasAnalyticsConsent());
    window.addEventListener("kaify:cookie-consent", onConsent);
    return () => window.removeEventListener("kaify:cookie-consent", onConsent);
  }, [isNativeApp]);

  if (isNativeApp === null || isNativeApp || !allowed) return null;

  return (
    <>
      <Script
        id="sender-net"
        strategy="afterInteractive"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: `
            (function (s, e, n, d, er) {
              s['Sender'] = er;
              s[er] = s[er] || function () {
                (s[er].q = s[er].q || []).push(arguments)
              }, s[er].l = 1 * new Date();
              s[er].on = function(event, callback) {
                s[er].listeners = s[er].listeners || {};
                (s[er].listeners[event] = s[er].listeners[event] || []).push(callback);
              };
              var a = e.createElement(n),
                  m = e.getElementsByTagName(n)[0];
              a.async = 1;
              a.src = d;
              m.parentNode.insertBefore(a, m)
            })(window, document, 'script', 'https://cdn.sender.net/accounts_resources/universal.js', 'sender');
            sender('570f2b53948830')
          `,
        }}
      />
      <Analytics />
      <SpeedInsights />
    </>
  );
}
