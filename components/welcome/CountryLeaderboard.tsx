"use client";

import { Globe, Trophy, X, Crown, Medal, Award, Flame } from "lucide-react";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/lang-context";

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

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="h-5 w-5 text-amber-400" fill="currentColor" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-zinc-300" fill="currentColor" />;
  if (rank === 3) return <Award className="h-5 w-5 text-amber-700" fill="currentColor" />;
  return <span className="text-sm font-bold text-zinc-500">{rank}</span>;
}

function FlagImage({ flagCode, size = 32 }: { flagCode: string; size?: number }) {
  return (
    <img
      src={`https://flagcdn.com/w40/${flagCode}.png`}
      alt=""
      width={size}
      height={size * 0.6}
      className="rounded-full object-cover"
      style={flagCode === "tr" ? { objectPosition: "35% center" } : undefined}
      loading="lazy"
    />
  );
}

export function CountryLeaderboard({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useLang();
  const [data, setData] = useState<CountryLeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch("/api/country-leaderboard?userId=user_001")
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 mx-4 mb-0 w-full max-w-sm animate-slide-up rounded-t-2xl border border-white/[0.08] bg-zinc-900/95 p-5 shadow-2xl backdrop-blur-xl sm:mb-auto sm:rounded-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/15">
              <Globe className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Country Leaderboard</h2>
              <p className="text-[10px] text-zinc-500">Global streak rankings</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-white/10" />
                <div className="h-4 flex-1 rounded bg-white/10" />
                <div className="h-4 w-16 rounded bg-white/10" />
              </div>
            ))}
          </div>
        ) : data ? (
          <>
            {/* Top 3 Podium */}
            <div className="mb-4 flex items-end justify-around gap-2 rounded-xl bg-white/[0.03] p-3">
              {data.leaderboard.slice(0, 3).map((entry, i) => (
                <div
                  key={entry.countryCode}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-full ring-2 ${
                      i === 0
                        ? "ring-amber-400/50"
                        : i === 1
                          ? "ring-zinc-300/40"
                          : "ring-amber-700/40"
                    }`}
                  >
                    <FlagImage flagCode={entry.flagCode} size={48} />
                  </div>
                  <span className="text-xs font-semibold text-zinc-200">{entry.countryName}</span>
                  <div className="flex items-center gap-1 text-[10px] text-orange-400/80">
                    <Flame className="h-3 w-3" />
                    <span>{entry.totalStreak.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <RankIcon rank={i + 1} />
                  </div>
                </div>
              ))}
            </div>

            {/* Full List */}
            <div className="max-h-[280px] space-y-1 overflow-y-auto pr-1">
              {data.leaderboard.map((entry, i) => {
                const isUser = entry.countryCode === data.userCountry;
                return (
                  <div
                    key={entry.countryCode}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 transition ${
                      isUser
                        ? "bg-purple-500/10 ring-1 ring-purple-500/20"
                        : "hover:bg-white/[0.03]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex w-6 items-center justify-center">
                        <RankIcon rank={i + 1} />
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full">
                        <FlagImage flagCode={entry.flagCode} size={32} />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-zinc-200">
                          {entry.countryName}
                          {isUser && (
                            <span className="ml-1.5 rounded-full bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-purple-300">
                              YOU
                            </span>
                          )}
                        </span>
                        <p className="text-[10px] text-zinc-500">{entry.userCount} users</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-orange-400/80">
                      <Flame className="h-3.5 w-3.5" />
                      <span className="font-semibold">{entry.totalStreak.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="mt-3 text-center text-[10px] text-zinc-600">
              {data.totalCountries} countries competing
            </p>
          </>
        ) : (
          <p className="py-8 text-center text-sm text-zinc-500">Could not load leaderboard.</p>
        )}
      </div>
    </div>
  );
}
