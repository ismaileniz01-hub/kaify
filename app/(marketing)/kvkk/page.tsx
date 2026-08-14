import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { KvkkDisclosureContent } from "@/components/legal/KvkkDisclosureContent";
import { publicPageMetadata } from "@/lib/seo/metadata";

export const metadata = publicPageMetadata({
  title: "KVKK Aydınlatma Metni — K.AIFY",
  description:
    "6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında aydınlatma metni.",
  path: "/kvkk",
});

export default function KvkkPage() {
  return (
    <LegalPageShell
      title="KVKK Aydınlatma Metni"
      subtitle="6698 sayılı Kanun kapsamında · Son güncelleme: 05 Temmuz 2026"
    >
      <KvkkDisclosureContent />
    </LegalPageShell>
  );
}
