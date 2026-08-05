import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { PrivacyPolicyContent } from "@/components/legal/PrivacyPolicyContent";
import { PRIVACY_VERSION } from "@/lib/legal/constants";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Privacy Policy — Kaify",
  description: "How Kaify collects, uses, and protects your personal data.",
};

export default async function PrivacyPage() {
  if ((await cookies()).get("kaify-lang")?.value === "tr") {
    redirect("/kvkk");
  }

  return (
    <LegalPageShell
      title="Privacy Policy"
      titleKey="legal.privacy_policy"
      subtitle={`Last updated: July 05, 2026 · Version ${PRIVACY_VERSION}`}
    >
      <PrivacyPolicyContent />
    </LegalPageShell>
  );
}
