"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { BarChart3, Flame, Globe, MessageCircle, Settings, ShoppingCart, User } from "lucide-react";
import { FitnessWallpaper } from "@/components/FitnessWallpaper";
import { WelcomeCard } from "@/components/welcome/WelcomeCard";
import { StreakAtRiskBanner } from "@/components/streak/StreakAtRiskBanner";
import { GemBalance } from "@/components/GemBalance";
import { FreezieBalance } from "@/components/FreezieBalance";
import { WelcomeSkeleton } from "@/components/welcome/WelcomeSkeleton";
import { DailyMotivationQuote } from "@/components/welcome/DailyMotivationQuote";
import { useSession } from "@/lib/session-context";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useLang, LANG_OPTIONS, hasStoredLangPreference } from "@/lib/lang-context";
import { captureReferralFromUrl, getPendingReferral } from "@/lib/referral";
import { InlineAlert } from "@/components/InlineAlert";
import { AppHeader } from "@/components/navigation/AppHeader";

const ProfileModal = dynamic(
  () =>
    import("@/components/ProfileModal").then((m) => ({ default: m.ProfileModal })),
  { ssr: false },
);
const NotificationCenter = dynamic(
  () =>
    import("@/components/notifications/NotificationCenter").then((m) => ({
      default: m.NotificationCenter,
    })),
  { ssr: false },
);
const PendingGiftCard = dynamic(
  () =>
    import("@/components/gifts/PendingGiftCard").then((m) => ({
      default: m.PendingGiftCard,
    })),
  { ssr: false },
);
const WelcomeExtras = dynamic(
  () =>
    import("@/components/welcome/WelcomeExtras").then((m) => ({
      default: m.WelcomeExtras,
    })),
  { ssr: false },
);

function WelcomeContent() {
  const [profileOpen, setProfileOpen] = useState(false);
  const [pendingReferral, setPendingReferral] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const { t, setLang, lang } = useLang();
  const {
    displayName,
    userProfile,
    home,
    gemBalance,
    streak,
    isPreviewMode,
    isLoading,
    updateProfile,
    profile,
    isAuthenticated,
    refreshHome,
  } = useSession();

  // ?profile=1 query param'ı ile gelindiyse profil modal'ını otomatik aç
  useEffect(() => {
    if (searchParams?.get("profile") === "1") {
      setProfileOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const code = captureReferralFromUrl(searchParams);
    setPendingReferral(code ?? getPendingReferral());
  }, [searchParams]);

  useEffect(() => {
    // Kullanıcı cihazda açıkça bir dil seçtiyse, bayat profil locale'i
    // o seçimi ezmemeli (aksi halde diğer sayfaya geçince dil geri döner).
    if (hasStoredLangPreference()) return;
    if (!isAuthenticated || !profile?.locale) return;
    const base = profile.locale.split("-")[0].toLowerCase();
    const match = LANG_OPTIONS.find((opt) => opt.code === base);
    if (match) setLang(match.code);
  }, [isAuthenticated, profile?.locale, setLang]);

  useEffect(() => {
    if (isAuthenticated) void refreshHome(lang);
  }, [lang, isAuthenticated, refreshHome]);

  if (isLoading && isAuthenticated) {
    return <WelcomeSkeleton />;
  }

  return (
    <div className="phone-shell welcome-page relative flex flex-col overflow-hidden">
      <FitnessWallpaper softVignette />

      <AppHeader
        leading={
          <>
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
              className="app-header__action border-purple-400/25 bg-purple-500/15 text-purple-300"
            aria-label={t("profile.title")}
          >
            <User className="h-4 w-4" strokeWidth={2} />
          </button>
            <Link
              href="/leaderboard"
              className="app-header__action border-amber-400/25 bg-amber-500/10 text-amber-400"
              aria-label={t("nav.leaderboard")}
            >
              <Globe className="h-4 w-4" />
            </Link>
          </>
        }
        trailing={
          <>
          <GemBalance balance={gemBalance.balance} size="sm" animate />
          <FreezieBalance balance={streak.freezieBalance} size="sm" animate />
          <NotificationCenter />
          <Link
            href="/settings"
              className="app-header__action"
            aria-label={t("nav.settings")}
          >
            <Settings className="h-4 w-4" strokeWidth={2} />
          </Link>
          </>
        }
      />

      <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto">
        <section className="animate-in animate-in--2 flex flex-col items-center px-6 pt-5 text-center">
          <h1
            className="welcome-title text-4xl font-extrabold leading-[1.05] tracking-tight drop-shadow-[0_4px_32px_rgba(168,85,247,0.35)] sm:text-5xl"
            style={{
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
            }}
          >
            {t("welcome.title", { name: displayName })}
          </h1>
          <p className="mt-4 max-w-[280px] text-sm font-medium leading-relaxed text-purple-100/80">
            <DailyMotivationQuote
              serverQuote={home?.motivation}
              fallback={t("welcome.subtitle")}
            />
          </p>
          {isPreviewMode && (
            <div className="mt-3 space-y-2">
              <p className="text-[10px] text-amber-400/80">{t("welcome.preview_mode")}</p>
              <Link
                href="/login"
                className="inline-flex rounded-full bg-purple-500/20 px-4 py-1.5 text-xs font-semibold text-purple-200 ring-1 ring-purple-400/30 transition hover:bg-purple-500/30"
              >
                {t("welcome.sign_in_cta")}
              </Link>
            </div>
          )}
          {!isAuthenticated && pendingReferral && (
            <InlineAlert
              variant="info"
              className="mt-3 max-w-xs"
              message={t("referral.welcome_banner", { code: pendingReferral })}
            />
          )}
        </section>

        {isAuthenticated && <PendingGiftCard />}

        <section className="mt-6 px-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="animate-in animate-in--3">
              <WelcomeCard
                href="/analytics"
                title={t("welcome.analytics")}
                subtitle={t("welcome.analytics.sub")}
                icon={BarChart3}
                gradient="green"
              />
            </div>
            <div className="animate-in animate-in--4">
              <WelcomeCard
                href="/messages"
                title={t("welcome.messages")}
                subtitle={t("welcome.messages.sub")}
                icon={MessageCircle}
                gradient="blue"
              />
            </div>
            <div className="animate-in animate-in--5">
              <WelcomeCard
                href="/streak"
                title={t("welcome.streak")}
                subtitle={t("welcome.streak.sub")}
                icon={Flame}
                gradient="orange"
              />
            </div>
            <div className="animate-in animate-in--6">
              <WelcomeCard
                href="/trophy-road"
                title={t("welcome.market")}
                subtitle={t("welcome.market.sub")}
                icon={ShoppingCart}
                gradient="gold"
              />
            </div>
          </div>
        </section>

        {/* Extra suggestions */}
        <section className="animate-in animate-in--7 mt-6 space-y-3 px-4 pb-10">
          {isAuthenticated && (
            <StreakAtRiskBanner
              currentStreak={streak.currentStreak}
              lastCheckInDate={streak.lastCheckInDate}
              freezieBalance={streak.freezieBalance}
            />
          )}
          <WelcomeExtras />
        </section>
      </main>

      {/* Profil Modal */}
      <ProfileModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        profile={userProfile}
        onSave={updateProfile}
      />
    </div>
  );
}

function WelcomeSuspenseFallback() {
  const { t } = useLang();
  return (
    <div className="phone-shell flex items-center justify-center">
      <p className="text-zinc-400">{t("welcome.loading")}</p>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <Suspense fallback={<WelcomeSuspenseFallback />}>
      <WelcomeContent />
    </Suspense>
  );
}
