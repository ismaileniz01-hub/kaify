import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "K.AIFY — Your AI Health Team",
  description:
    "Four AI coaches, smart analytics, and Kai your dragon companion. Join the waitlist for the fitness app that finally sticks.",
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
