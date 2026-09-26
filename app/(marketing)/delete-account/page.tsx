import { DeleteAccountRequestContent } from "@/components/legal/DeleteAccountRequestContent";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { DELETE_ACCOUNT_PATH } from "@/lib/legal/constants";
import { publicPageMetadata } from "@/lib/seo/metadata";

export const metadata = publicPageMetadata({
  title: "Delete your Kaify Ai account",
  description:
    "Request deletion of your Kaify Ai account and associated data. Use this page if you uninstalled the app.",
  path: DELETE_ACCOUNT_PATH,
});

export default function DeleteAccountPage() {
  return (
    <LegalPageShell
      title="Delete your account"
      titleKey="legal.delete_account_title"
      subtitle="Last updated: August 22, 2026"
    >
      <DeleteAccountRequestContent />
    </LegalPageShell>
  );
}
