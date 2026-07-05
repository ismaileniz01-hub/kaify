"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { hasAnalyticsConsent } from "@/lib/legal/cookie-consent";

type OptionalAnalyticsProps = {
  nonce?: string;
};

/** Loads marketing/analytics only after explicit cookie consent. */
export function OptionalAnalytics({ nonce }: OptionalAnalyticsProps) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    setAllowed(hasAnalyticsConsent());

    const onConsent = () => setAllowed(hasAnalyticsConsent());
    window.addEventListener("kaify:cookie-consent", onConsent);
    return () => window.removeEventListener("kaify:cookie-consent", onConsent);
  }, []);

  if (!allowed) return null;

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
