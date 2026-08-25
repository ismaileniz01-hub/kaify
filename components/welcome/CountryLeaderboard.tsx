"use client";

import { Globe, X, Crown, Medal, Award, Flame } from "lucide-react";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/lang-context";
import { formatNumber } from "@/lib/i18n/format";
import { FlagImage } from "@/components/FlagImage";
import { MotionDialog } from "@/components/ui/MotionDialog";
import { getApiAuthHeaders, resolveApiPath } from "@/lib/api/client";

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

export function CountryLeaderboard({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t, lang } = useLang();
  const [data, setData] = useState<CountryLeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    void getApiAuthHeaders()
      .then((headers) => fetch(resolveApiPath("/api/country-leaderboard"), { headers }))
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isOpen]);

  return (
    <MotionDialog
      open={isOpen}
      onClose={onClose}
      labelledBy="country-leaderboard-title"
      variant="sheet"
      fullBleed
      className="z-50 sm:p-4"
      panelClassName="relative z-10 mx-4 mb-0 w-full max-w-sm rounded-t-2xl border border-white/[0.08] bg-zinc-900/95 p-5 shadow-2xl backdrop-blur-xl sm:mb-auto sm:rounded-2xl"
    >
      <div>
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/15">
              <Globe className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <h2 id="country-leaderboard-title" className="text-sm font-bold text-white">{t("leaderboard.country_title")}</h2>
              <p className="text-[10px] text-zinc-500">{t("leaderboard.country_subtitle")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="touch-44 flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="premium-skeleton h-8 w-8 rounded-full" />
                <div className="premium-skeleton h-4 flex-1 rounded" />
                <div className="premium-skeleton h-4 w-16 rounded" />
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
                    <span>{formatNumber(entry.totalStreak, lang)}</span>
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
                              {t("leaderboard.you")}
                            </span>
                          )}
                        </span>
                        <p className="text-[10px] text-zinc-500">{t("leaderboard.users_count", { count: entry.userCount })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-orange-400/80">
                      <Flame className="h-3.5 w-3.5" />
                      <span className="font-semibold">{formatNumber(entry.totalStreak, lang)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="mt-3 text-center text-[10px] text-zinc-600">
              {t("leaderboard.countries_competing", { count: data.totalCountries })}
            </p>
          </>
        ) : (
          <p className="py-8 text-center text-sm text-zinc-500">{t("leaderboard.error.load")}</p>
        )}
      </div>
    </MotionDialog>
  );
}
