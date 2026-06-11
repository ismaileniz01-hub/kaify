import Image from "next/image";
import Link from "next/link";
import { Chrome } from "lucide-react";
import { FitnessWallpaper } from "@/components/FitnessWallpaper";

export default function LoginPage() {
  return (
    <div className="phone-shell relative flex flex-col overflow-hidden">
      <FitnessWallpaper />

      <main className="relative z-10 flex flex-1 flex-col items-center justify-between px-8 pb-16 pt-16">
        <div className="flex flex-1 flex-col items-center justify-center gap-6 pt-2">
          <div className="relative flex items-center justify-center">
            <div
              className="absolute h-52 w-52 rounded-full bg-purple-500/25 blur-3xl"
              aria-hidden
            />
            <Image
              src="/kaify-logo.png"
              alt="K.AIFY"
              width={220}
              height={220}
              className="relative h-48 w-48 object-contain drop-shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
              priority
            />
          </div>

          <div className="flex flex-col items-center gap-3 text-center">
            <h1
              className="text-6xl font-bold leading-none tracking-[0.08em] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
              style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
            >
              K.AIFY
            </h1>
            <p className="max-w-[280px] text-base font-medium leading-snug tracking-wide text-purple-100/90">
              4 AI koç. Tek takım. Senin için tasarlandı.
            </p>
          </div>
        </div>

        <div className="flex w-full max-w-xs flex-col gap-4">
          <Link
            href="/welcome"
            className="flex w-full items-center justify-center gap-3 rounded-full bg-white px-6 py-4 text-sm font-semibold text-zinc-900 shadow-xl shadow-black/30 transition active:scale-[0.98]"
          >
            <Chrome className="h-5 w-5" strokeWidth={2} />
            Google ile devam et
          </Link>

          <Link
            href="/welcome"
            className="flex w-full items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-4 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/15 active:scale-[0.98]"
          >
            Prototipi önizle
          </Link>

          <Link
            href="/"
            className="text-center text-xs text-purple-200/60 transition hover:text-purple-100"
          >
            ← Ana sayfaya dön
          </Link>

          <p className="text-center text-xs text-purple-200/50">
            Devam ederek{" "}
            <span className="text-purple-100/70 underline-offset-2 hover:underline">
              Kullanım Şartları
            </span>
            &apos;nı kabul edersin
          </p>
        </div>
      </main>
    </div>
  );
}
