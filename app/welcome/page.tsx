"use client";

import Link from "next/link";
import { ArrowLeft, BarChart3, Flame, Globe, MessageCircle, Settings, ShoppingCart, User } from "lucide-react";
import { FitnessWallpaper } from "@/components/FitnessWallpaper";
import { WelcomeCard } from "@/components/welcome/WelcomeCard";
import { WelcomeExtras } from "@/components/welcome/WelcomeExtras";
import { GemBalance } from "@/components/GemBalance";
import { ProfileModal } from "@/components/ProfileModal";
import { DEMO_USER_NAME, DEMO_USER_PROFILE } from "@/lib/user";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function WelcomeContent() {
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

      {/* Header — left: profile + back, center: Leaderboard, right: Gems + Settings */}
      <header className="animate-in animate-in--1 relative z-20 flex items-center justify-between px-4 pt-14">
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-zinc-400 ring-2 ring-white/15 transition-all duration-300 hover:bg-white/20 hover:text-white hover:scale-110"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          </Link>
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-purple-300 ring-2 ring-purple-400/30 transition-all duration-300 hover:bg-purple-500/30 hover:text-purple-200 hover:scale-110"
            aria-label="Profile"
          >
            <User className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {/* Center — Leaderboard button */}
        <Link
          href="/leaderboard"
          className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1.5 text-amber-400 ring-2 ring-amber-400/30 transition-all duration-300 hover:bg-amber-500/25 hover:text-amber-300 hover:scale-105"
          aria-label="Leaderboard"
        >
          <Globe className="h-3.5 w-3.5" />
          <span className="text-[11px] font-semibold">Leaderboard</span>
        </Link>

        <div className="flex items-center gap-2">
          <GemBalance balance={1000} size="sm" animate />
          <Link
            href="/settings"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-zinc-400 ring-2 ring-white/15 transition-all duration-300 hover:bg-white/20 hover:text-white hover:scale-110"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto">
        {/* Welcome — big and bold */}
        <section className="animate-in animate-in--2 flex flex-col items-center px-6 pt-6 text-center">
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

        {/* Main cards — opaque with 3D shadows */}
        <section className="mt-8 px-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="animate-in animate-in--3">
              <WelcomeCard
                href="/analytics"
                title="Analytics"
                subtitle="Track your progress"
                icon={BarChart3}
                gradient="green"
              />
            </div>
            <div className="animate-in animate-in--4">
              <WelcomeCard
                href="/messages"
                title="Messages"
                subtitle="Chat with coaches"
                icon={MessageCircle}
                gradient="blue"
              />
            </div>
            <div className="animate-in animate-in--5">
              <WelcomeCard
                href="/streak"
                title="Streak"
                subtitle="Keep your streak"
                icon={Flame}
                gradient="orange"
              />
            </div>
            <div className="animate-in animate-in--6">
              <WelcomeCard
                href="/trophy-road"
                title="Market"
                subtitle="Start shopping"
                icon={ShoppingCart}
                gradient="gold"
              />
            </div>
          </div>
        </section>

        {/* Extra suggestions */}
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

export default function WelcomePage() {
  return (
    <Suspense fallback={<div className="phone-shell flex items-center justify-center"><p className="text-zinc-400">Loading...</p></div>}>
      <WelcomeContent />
    </Suspense>
  );
}
