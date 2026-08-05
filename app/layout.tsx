import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies, headers } from "next/headers";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-context";
import { LangProvider, type LangCode } from "@/lib/lang-context";
import { ToastProvider } from "@/components/ui/ToastProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const isTurkish = (await cookies()).get("kaify-lang")?.value === "tr";
  return {
    title: isTurkish
      ? "K.AIFY — Kişisel Koç Ekibin"
      : "K.AIFY — Your Personal Coach Team",
    description: isTurkish
      ? "Dört uzman koç, akıllı analizler ve ejderha yoldaşın Kai. Planlar aylık $14.99'dan başlar."
      : "Four expert coaches, smart analytics, and Kai your dragon companion. Plans from $14.99/month.",
    manifest: "/manifest.json",
    icons: {
      icon: [
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "K.AIFY",
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Allow pinch-zoom (WCAG 1.4.4). Keep cover for notch/safe-area.
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

const SUPPORTED_LANGS: readonly LangCode[] = [
  "tr",
  "en",
];
const SUPPORTED_LANG_SET = new Set<string>(SUPPORTED_LANGS);

function requestLang(cookieValue: string | undefined, acceptLanguage: string | null): LangCode {
  if (cookieValue && SUPPORTED_LANG_SET.has(cookieValue)) {
    return cookieValue as LangCode;
  }

  for (const candidate of (acceptLanguage ?? "").split(",")) {
    const tag = candidate.split(";")[0]?.trim().toLowerCase();
    if (!tag) continue;
    const exact = SUPPORTED_LANGS.find((code) => code.toLowerCase() === tag);
    if (exact) return exact;
    const base = tag.split("-")[0];
    const baseMatch = SUPPORTED_LANGS.find((code) => code.toLowerCase() === base);
    if (baseMatch) return baseMatch;
  }
  return "en";
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const initialLang = requestLang(
    cookieStore.get("kaify-lang")?.value,
    headerStore.get("accept-language"),
  );
  const skipLabel =
    initialLang === "tr"
      ? "İçeriğe geç"
      : "Skip to content";

  return (
    <html
      lang={initialLang}
      dir="ltr"
      suppressHydrationWarning
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <a href="#main-content" className="skip-to-content">
          {skipLabel}
        </a>
        <ThemeProvider>
          <LangProvider initialLang={initialLang}>
            <ToastProvider>{children}</ToastProvider>
          </LangProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
