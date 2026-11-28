import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { RefundPolicyContent } from "@/components/legal/RefundPolicyContent";
import { publicPageMetadata } from "@/lib/seo/metadata";

export const metadata = publicPageMetadata({
  title: "Refund Policy — Kaify Ai",
  description: "When Kaify Ai payments can be refunded: final sales, statutory withdrawal rights and faulty service.",
  path: "/refund",
});

export default function RefundPage() {
  return (
    <LegalPageShell title="Refund Policy" titleKey="legal.refund">
      <RefundPolicyContent />
    </LegalPageShell>
  );
}
