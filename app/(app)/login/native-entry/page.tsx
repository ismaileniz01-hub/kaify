import { headers } from "next/headers";
import { FitnessWallpaper } from "@/components/FitnessWallpaper";
import { NATIVE_ENTRY_BOOT_SCRIPT } from "@/lib/native/native-entry-boot";

/**
 * Capacitor hands off here after local auth. Hash tokens never hit the server.
 * Inline boot script sets cookies even if React hydration is delayed in WKWebView.
 */
export default async function NativeEntryPage() {
  const nonce = (await headers()).get("x-nonce") ?? "";

  return (
    <div className="phone-shell login-page relative flex min-h-dvh flex-col">
      <FitnessWallpaper />
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p id="native-entry-status" className="text-sm text-zinc-300">
          Kaify açılıyor…
        </p>
        <div id="native-entry-actions" hidden className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            id="native-entry-retry"
            className="text-sm text-zinc-100 underline underline-offset-4"
          >
            Tekrar dene
          </button>
          <button
            type="button"
            id="native-entry-back"
            className="text-sm text-zinc-400 underline underline-offset-4"
          >
            Girişe dön
          </button>
        </div>
      </main>
      <script
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: NATIVE_ENTRY_BOOT_SCRIPT }}
      />
    </div>
  );
}
