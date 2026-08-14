import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { PrivacyPolicyContent } from "@/components/legal/PrivacyPolicyContent";
import { PrivacyLocaleRedirect } from "@/components/legal/PrivacyLocaleRedirect";
import { PRIVACY_VERSION } from "@/lib/legal/constants";

export const metadata = {
  title: "Privacy Policy — Kaify",
  description: "How Kaify collects, uses, and protects your personal data.",
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      titleKey="legal.privacy_policy"
      subtitle={`Last updated: July 05, 2026 · Version ${PRIVACY_VERSION}`}
    >
      <PrivacyLocaleRedirect />
      <PrivacyPolicyContent />
    </LegalPageShell>
  );
}
