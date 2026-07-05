import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { KvkkDisclosureContent } from "@/components/legal/KvkkDisclosureContent";

export const metadata = {
  title: "KVKK Aydınlatma Metni — Kaify",
  description: "6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında aydınlatma metni.",
};

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
