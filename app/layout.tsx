import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { GemProvider } from "@/lib/gem-context";
import { KaiProvider } from "@/lib/kai-context";
import { ThemeProvider } from "@/lib/theme-context";
import { LangProvider } from "@/lib/lang-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "K.AIFY — Your Personal Coach Team",
  description:
    "Four expert coaches, smart analytics, and Kai your dragon companion. Join the waitlist for the fitness app that finally sticks.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          id="sender-net"
          strategy="afterInteractive"
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
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ viewTransitionName: "root" }}
      >
        <ThemeProvider>
          <LangProvider>
            <GemProvider>
              <KaiProvider>{children}</KaiProvider>
            </GemProvider>
          </LangProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
