import type { Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-context";
import { LangProvider } from "@/lib/lang-context";
import { rootMetadata } from "@/lib/seo/metadata";
import { SkipToContent } from "@/components/a11y/SkipToContent";

export const metadata = rootMetadata();

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

/** Cookie-free root so marketing routes can be statically generated (PERF-004). */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <LangProvider initialLang="en">
            <SkipToContent />
            {children}
          </LangProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
