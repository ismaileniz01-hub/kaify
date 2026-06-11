"use client";

import Link from "next/link";
import { ArrowLeft, BarChart3, Flame, MessageCircle, Settings, ShoppingCart, User } from "lucide-react";
import { FitnessWallpaper } from "@/components/FitnessWallpaper";
import { WelcomeCard } from "@/components/welcome/WelcomeCard";
import { WelcomeExtras } from "@/components/welcome/WelcomeExtras";
import { GemBalance } from "@/components/GemBalance";
import { ProfileModal } from "@/components/ProfileModal";
import { DEMO_USER_NAME, DEMO_USER_PROFILE } from "@/lib/user";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function WelcomePage() {
  const [profileOpen, setProfileOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(DEMO_USER_PROFILE);
  const searchParams = useSearchParams();

  // ?profile=1 query param'ı ile gelindiyse profil modal'ını otomatik aç
  useEffect(() => {
    if (searchParams?.get("profile") === "1") {
      setProfileOpen(true);
    }
  }, [searchParams]);

  return (
    <div className="phone-shell welcome-page relative flex flex-col overflow-hidden">
      <FitnessWallpaper softVignette />

      {/* Üst header — sol: profil + geri, sağ: Gem + Ayarlar */}
      <header className="animate-in animate-in--1 relative z-20 flex items-center justify-between px-4 pt-14">
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-zinc-400 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white"
            aria-label="Giriş"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          </Link>
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-purple-300 ring-1 ring-purple-400/30 transition hover:bg-purple-500/30 hover:text-purple-200"
            aria-label="Profil"
          >
            <User className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <GemBalance balance={1000} size="sm" animate />
          <Link
            href="/settings"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-zinc-400 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white"
            aria-label="Ayarlar"
          >
            <Settings className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto">
        {/* Karşılama — büyük ve gösterişli */}
        <section className="animate-in animate-in--2 flex flex-col items-center px-6 pt-12 text-center">
          <h1
            className="welcome-title text-5xl font-extrabold leading-none tracking-tight drop-shadow-[0_4px_32px_rgba(168,85,247,0.35)]"
            style={{
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
            }}
          >
            Welcome, {DEMO_USER_NAME}
          </h1>
          <p className="mt-4 max-w-[280px] text-sm font-medium leading-relaxed text-purple-100/80">
            Small steps today, big wins tomorrow.
            <br />
            Your team is ready.
          </p>
        </section>

        {/* Ana bölmeler — opak ve 3D gölgeli */}
        <section className="mt-8 px-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="animate-in animate-in--3">
              <WelcomeCard
                href="/analytics"
                title="Analiz"
                subtitle="İlerlemeni gör"
                icon={BarChart3}
                gradient="green"
              />
            </div>
            <div className="animate-in animate-in--4">
              <WelcomeCard
                href="/messages"
                title="Mesajlaşma"
                subtitle="Koçlarınla konuş"
                icon={MessageCircle}
                gradient="blue"
              />
            </div>
            <div className="animate-in animate-in--5">
              <WelcomeCard
                href="/streak"
                title="Streak"
                subtitle="Serini koru"
                icon={Flame}
                gradient="orange"
              />
            </div>
            <div className="animate-in animate-in--6">
              <WelcomeCard
                href="/trophy-road"
                title="Market"
                subtitle="Alışverişe başla"
                icon={ShoppingCart}
                gradient="gold"
              />
            </div>
          </div>
        </section>

        {/* Alt öneriler — haftalık hedef kaldırıldı, her şey aşağı çekildi */}
        <section className="animate-in animate-in--7 mt-6 px-4 pb-10">
          <WelcomeExtras />
        </section>
      </main>

      {/* Profil Modal */}
      <ProfileModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        profile={userProfile}
        onSave={(updated) => setUserProfile(updated)}
      />
    </div>
  );
}
