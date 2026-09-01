import { FitnessWallpaper } from "@/components/FitnessWallpaper";

export default function NativeEntryLoading() {
  return (
    <div className="phone-shell login-page relative flex min-h-dvh flex-col">
      <FitnessWallpaper />
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="text-sm text-zinc-300">Kaify açılıyor…</p>
      </main>
    </div>
  );
}
