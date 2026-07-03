"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Globe,
  Flame,
  Crown,
  Medal,
  Award,
  Trophy,
  Sparkles,
  ChevronUp,
  Zap,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { FitnessWallpaper } from "@/components/FitnessWallpaper";
import { useLang } from "@/lib/lang-context";
import { useSession } from "@/lib/session-context";
import { apiGet, ApiClientError } from "@/lib/api/client";
import { getCountryName } from "@/lib/country-names";
import type { CountryLeaderboardDTO } from "@/lib/types/domain.types";

type CountryEntry = {
  countryCode: string;
  countryName: string;
  flagCode: string;
  totalStreak: number;
  userCount: number;
};

type CountryLeaderboardData = {
  leaderboard: CountryEntry[];
  userCountry: string | null;
  userCountryRank: number | null;
  totalCountries: number;
};

// Özel bayrak URL'leri (flagcdn'de olmayanlar için)
const CUSTOM_FLAG_URLS: Record<string, string> = {
  ct: "/flag-northern-cyprus.svg",
};

// FlagCDN'den daha yüksek çözünürlüklü bayrak
function FlagImage({ flagCode, size = 40 }: { flagCode: string; size?: number }) {
  const isCustom = flagCode in CUSTOM_FLAG_URLS;
  const src = isCustom ? CUSTOM_FLAG_URLS[flagCode] : `https://flagcdn.com/h80/${flagCode}.png`;
  const srcSet = isCustom ? undefined : `https://flagcdn.com/h40/${flagCode}.png 1x, https://flagcdn.com/h80/${flagCode}.png 2x`;

  return (
    <img
      src={src}
      srcSet={srcSet}
      alt=""
      width={size}
      height={size * 0.6}
      className="rounded-full object-cover shadow-lg"
      style={flagCode === "tr" ? { objectPosition: "35% center" } : undefined}
      loading="lazy"
    />
  );
}

// Sayı animasyonu: 0'dan hedef değere yükselme
function AnimatedNumber({ value, duration = 1500 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplay(Math.floor(eased * value));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span ref={ref}>{display.toLocaleString()}</span>;
}

function PodiumStep({
  entry,
  rank,
  barHeight,
  delay,
}: {
  entry: CountryEntry;
  rank: number;
  barHeight: string;
  delay: number;
}) {
  const colors = [
    {
      ring: "ring-amber-400/70",
      bg: "from-amber-400/30 to-amber-500/20",
      border: "border-amber-400/40",
      text: "text-amber-300",
      shadow: "shadow-amber-400/30",
      icon: Crown,
    },
    {
      ring: "ring-zinc-300/60",
      bg: "from-zinc-300/30 to-zinc-400/20",
      border: "border-zinc-300/40",
      text: "text-zinc-300",
      shadow: "shadow-zinc-300/30",
      icon: Medal,
    },
    {
      ring: "ring-amber-700/60",
      bg: "from-amber-700/30 to-amber-800/20",
      border: "border-amber-700/40",
      text: "text-amber-600",
      shadow: "shadow-amber-700/30",
      icon: Award,
    },
  ];

  const c = colors[rank - 1];
  const Icon = c.icon;

  return (
    <div
      className="group flex flex-col items-center gap-2"
      style={{
        animation: `podiumRise 0.8s ${delay}ms cubic-bezier(0.34, 1.56, 0.64, 1) both`,
      }}
    >
      {/* Rozet */}
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-full bg-white/15 ${c.text} ring-2 ${c.ring} transition-all duration-500 group-hover:scale-110 group-hover:shadow-lg ${c.shadow}`}
      >
        <Icon className="h-4 w-4" fill="currentColor" />
      </div>

      {/* Bayrak */}
      <div
        className={`relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full ring-2 ${c.ring} shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:shadow-2xl ${c.shadow}`}
      >
        <FlagImage flagCode={entry.flagCode} size={64} />
        {/* Parlama efekti */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/0 via-white/15 to-white/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      </div>

      {/* Ülke adı */}
      <span className="text-sm font-bold text-white drop-shadow-lg transition-all duration-300 group-hover:text-amber-200">
        {entry.countryName}
      </span>

      {/* Kullanıcı sayısı */}
      <span className="text-[10px] text-zinc-500">{entry.userCount} users</span>

      {/* Streak */}
      <div className="flex items-center gap-1 text-sm text-orange-400">
        <Flame className="h-4 w-4 transition-all duration-300 group-hover:scale-125 group-hover:text-orange-300" />
        <span className="font-extrabold">
          <AnimatedNumber value={entry.totalStreak} duration={2000} />
        </span>
      </div>

      {/* Basamak */}
      <div
        className={`mt-1 w-24 rounded-t-lg bg-gradient-to-t ${c.bg} ring-2 ring-white/15 flex items-center justify-center transition-all duration-500 group-hover:shadow-lg ${c.shadow}`}
        style={{ height: barHeight }}
      >
        <span className={`text-lg font-black ${c.text}`}>#{rank}</span>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const { t } = useLang();
  const { profile, isAuthenticated } = useSession();
  const [data, setData] = useState<CountryLeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      fetch("/api/country-leaderboard")
        .then((res) => res.json())
        .then((json) => {
          setData(json);
          setLoading(false);
        })
        .catch(() => setLoading(false));
      return;
    }

    apiGet<{ leaderboard: CountryLeaderboardDTO[] }>("/api/leaderboard/country?limit=100")
      .then((result) => {
        const userCountry = profile?.countryCode.toLowerCase() ?? null;
        const leaderboard: CountryEntry[] = result.leaderboard.map((row) => ({
          countryCode: row.countryCode,
          countryName: getCountryName(row.countryCode),
          flagCode: row.flagCode,
          totalStreak: row.totalStreak,
          userCount: row.userCount,
        }));
        const userCountryRank = userCountry
          ? leaderboard.findIndex((c) => c.countryCode === userCountry) + 1
          : null;
        setData({
          leaderboard,
          userCountry,
          userCountryRank: userCountryRank && userCountryRank > 0 ? userCountryRank : null,
          totalCountries: leaderboard.length,
        });
        setLoading(false);
      })
      .catch((error) => {
        if (error instanceof ApiClientError) {
          console.error("[leaderboard]", error.message);
        }
        setLoading(false);
      });
  }, [isAuthenticated, profile?.countryCode]);

  return (
    <div className="phone-shell relative flex flex-col overflow-hidden">
      <FitnessWallpaper softVignette />

      {/* Header */}
      <header className="animate-in animate-in--1 relative z-20 flex items-center justify-between px-4 pt-14">
        <Link
          href="/welcome"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-zinc-400 ring-2 ring-white/15 transition-all duration-300 hover:bg-white/20 hover:text-white hover:scale-110"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 ring-2 ring-amber-400/30">
            <Globe className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <span className="text-sm font-bold text-white">{t("nav.leaderboard")}</span>
        </div>
        <div className="h-8 w-8" />
      </header>

      <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto">
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="relative h-12 w-12">
                <div className="absolute inset-0 animate-spin rounded-full border-2 border-amber-400/20 border-t-amber-400" />
                <div className="absolute inset-1 animate-spin rounded-full border-2 border-amber-400/10 border-b-amber-400" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
              </div>
              <p className="text-sm font-medium text-zinc-500 animate-pulse">Loading rankings...</p>
            </div>
          </div>
        ) : data ? (
          <>
            {/* Podyum */}
            <section className="animate-in animate-in--2 mt-4 px-4">
              <div className="relative overflow-hidden rounded-2xl border-2 border-white/[0.12] bg-zinc-900/80 p-4 backdrop-blur-md shadow-2xl shadow-black/30">
                {/* Arka plan ışıltısı */}
                <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-amber-500/10 blur-3xl" />

                {/* Başlık */}
                <div className="relative mb-4 flex items-center justify-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-400" />
                  <h2 className="text-sm font-bold tracking-widest text-zinc-400">
                    Top Countries
                  </h2>
                  <Sparkles className="h-4 w-4 text-amber-400/60" />
                </div>

                {/* Podyum basamakları */}
                <div className="flex items-end justify-center gap-4">
                  {data.leaderboard[1] && (
                    <PodiumStep entry={data.leaderboard[1]} rank={2} barHeight="4rem" delay={300} />
                  )}
                  {data.leaderboard[0] && (
                    <PodiumStep entry={data.leaderboard[0]} rank={1} barHeight="6rem" delay={150} />
                  )}
                  {data.leaderboard[2] && (
                    <PodiumStep entry={data.leaderboard[2]} rank={3} barHeight="3rem" delay={450} />
                  )}
                </div>
              </div>
            </section>

            {/* Sıralama listesi */}
            <section className="animate-in animate-in--3 mt-4 flex-1 px-4 pb-8">
              <div className="relative overflow-hidden rounded-2xl border-2 border-white/[0.12] bg-zinc-900/80 p-3 backdrop-blur-md shadow-2xl shadow-black/30">
                {/* Başlık satırı */}
                <div className="mb-3 flex items-center justify-between border-b border-white/[0.08] px-2 pb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-3.5 w-3.5 text-zinc-500" />
                    <span className="text-[10px] font-semibold tracking-wider text-zinc-500">
                      All Countries
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-orange-400/60" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                      Streak
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {data.leaderboard.slice(3).map((entry, i) => {
                    const rank = i + 4;
                    const isUser = entry.countryCode === data.userCountry;
                    return (
                      <div
                        key={entry.countryCode}
                        className={`group relative overflow-hidden rounded-xl border-2 px-3 py-2.5 transition-all duration-300 ${
                          isUser
                            ? "border-purple-500/40 bg-gradient-to-r from-purple-500/15 to-purple-500/5 shadow-lg shadow-purple-500/15"
                            : "border-white/[0.08] bg-white/[0.04] hover:border-white/[0.15] hover:bg-white/[0.08] hover:shadow-lg hover:shadow-black/15"
                        }`}
                      >
                        {/* Hover parlaması */}
                        <div className="absolute -right-8 -top-8 h-16 w-16 rounded-full bg-white/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100 blur-xl" />

                        <div className="relative flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {/* Sıra numarası */}
                            <div className="flex h-7 w-7 items-center justify-center">
                              <span className="text-xs font-bold text-zinc-500">{rank}</span>
                            </div>

                            {/* Bayrak */}
                            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full ring-2 ring-white/15 transition-all duration-300 group-hover:ring-2 group-hover:ring-amber-400/40">
                              <FlagImage flagCode={entry.flagCode} size={36} />
                            </div>

                            {/* Ülke bilgisi */}
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-semibold text-zinc-200 transition-colors duration-300 group-hover:text-white">
                                  {entry.countryName}
                                </span>
                                {isUser && (
                                  <span className="rounded-full bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-bold text-purple-300 ring-1 ring-purple-400/20">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-zinc-500">{entry.userCount} active users</p>
                            </div>
                          </div>

                          {/* Streak */}
                          <div className="flex items-center gap-1.5">
                            <Flame className="h-3.5 w-3.5 text-orange-400/70 transition-all duration-300 group-hover:scale-125 group-hover:text-orange-300" />
                            <span className="text-sm font-bold text-orange-300">
                              <AnimatedNumber value={entry.totalStreak} duration={2000} />
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Alt bilgi */}
                <div className="mt-4 flex items-center justify-center gap-2 border-t border-white/[0.08] pt-3">
                  <Globe className="h-3 w-3 text-zinc-600" />
                  <p className="text-[10px] text-zinc-600">
                    {data.totalCountries} countries competing
                  </p>
                  <span className="text-zinc-700">·</span>
                  <ChevronUp className="h-3 w-3 text-zinc-600" />
                  <p className="text-[10px] font-medium text-zinc-500">
                    Your rank: #{data.userCountryRank}
                  </p>
                </div>
              </div>
            </section>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-white/[0.08] bg-zinc-900/80 px-8 py-12 backdrop-blur-md">
              <Globe className="h-8 w-8 text-zinc-600" />
              <p className="text-sm text-zinc-500">Could not load leaderboard.</p>
            </div>
          </div>
        )}
      </main>

      {/* Podyum yükselme animasyonu */}
      <style jsx>{`
        @keyframes podiumRise {
          0% {
            opacity: 0;
            transform: translateY(60px) scale(0.8);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
