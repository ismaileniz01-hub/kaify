import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { CookiePolicyContent } from "@/components/legal/CookiePolicyContent";
import { publicPageMetadata } from "@/lib/seo/metadata";

export const metadata = publicPageMetadata({
  title: "Cookie Policy — K.AIFY",
  description: "How Kaify uses essential and optional cookies on the website and app.",
  path: "/cookies",
});

export default function CookiesPage() {
  return (
    <LegalPageShell
      title="Cookie Policy"
      titleKey="legal.cookie_policy"
    >
      <CookiePolicyContent />
    </LegalPageShell>
  );
}
