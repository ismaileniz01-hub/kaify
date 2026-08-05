import { cookies } from "next/headers";
import { translateKey } from "@/lib/i18n/dictionary";

/** Screen-reader loading label that follows the `kaify-lang` cookie. */
export async function SrOnlyLoading() {
  const lang = (await cookies()).get("kaify-lang")?.value;
  const label = await translateKey(lang, "common.loading");
  return <p className="sr-only">{label}</p>;
}
