import { headers } from "next/headers";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { PrivacyPolicyContent } from "@/components/legal/PrivacyPolicyContent";
import { TermlyPrivacyEmbed } from "@/components/legal/TermlyPrivacyEmbed";
import { PRIVACY_TERMLY_DATA_ID, PRIVACY_VERSION } from "@/lib/legal/constants";

export const metadata = {
  title: "Privacy Policy — Kaify",
  description: "How Kaify collects, uses, and protects your personal data.",
};

export default async function PrivacyPage() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const useTermly = Boolean(PRIVACY_TERMLY_DATA_ID);

  return (
    <LegalPageShell
      title="Privacy Policy"
      subtitle={`Last updated: July 05, 2026 · Version ${PRIVACY_VERSION}`}
    >
      {useTermly ? (
        <div className="termly-embed-shell rounded-xl border border-white/10 bg-white p-4 text-zinc-900">
          <TermlyPrivacyEmbed nonce={nonce} />
        </div>
      ) : (
        <PrivacyPolicyContent />
      )}
    </LegalPageShell>
  );
}
