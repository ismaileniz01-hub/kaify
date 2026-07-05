import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { CookiePolicyContent } from "@/components/legal/CookiePolicyContent";
import { COOKIES_VERSION } from "@/lib/legal/constants";

export const metadata = {
  title: "Cookie Policy — Kaify",
};

export default function CookiesPage() {
  return (
    <LegalPageShell
      title="Cookie Policy"
      subtitle={`Last updated: July 05, 2026 · Version ${COOKIES_VERSION}`}
    >
      <CookiePolicyContent />
    </LegalPageShell>
  );
}
