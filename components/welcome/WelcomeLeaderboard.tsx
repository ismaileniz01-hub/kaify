"use client";

import { Trophy, Flame, ChevronRight, Globe, Crown, Medal, Award } from "lucide-react";
import { useEffect, useState } from "react";
import { DEMO_USER_NAME } from "@/lib/user";
import { useLang } from "@/lib/lang-context";

type LeaderboardEntry = {
  userId: string;
  name: string;
  flagCode: string;
  streak: number;
  avatar: string;
};

type LeaderboardData = {
  leaderboard: LeaderboardEntry[];
  userRank: number | null;
  totalUsers: number;
};

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="h-4 w-4 text-amber-400" fill="currentColor" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-zinc-300" fill="currentColor" />;
  if (rank === 3) return <Award className="h-4 w-4 text-amber-700" fill="currentColor" />;
  return <span className="text-xs font-bold text-zinc-500">{rank}</span>;
}

function FlagImage({ flagCode, size = 24 }: { flagCode: string; size?: number }) {
  return (
    <img
      src={`https://flagcdn.com/w40/${flagCode}.png`}
      alt=""
      width={size}
      height={size * 0.6}
      className="h-full w-full rounded-full object-cover"
      style={flagCode === "tr" ? { objectPosition: "35% center" } : undefined}
      loading="lazy"
    />
  );
}

export function WelcomeLeaderboard() {
  const { t } = useLang();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch("/api/leaderboard?userId=user_001")
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-4 mt-4 animate-pulse rounded-2xl bg-white/[0.03] p-4">
        <div className="h-4 w-32 rounded bg-white/10" />
      </div>
    );
  }

  if (!data) return null;

  const top3 = data.leaderboard.slice(0, 3);
  const rest = data.leaderboard.slice(3, 7);

  return (
    <div className="mx-4 mt-4">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 text-left transition hover:bg-white/[0.04] active:scale-[0.98]"
      >
        {/* Header */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/15">
              <Trophy className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Leaderboard
            </span>
            {data.userRank && (
              <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-medium text-purple-300">
                #{data.userRank}
              </span>
            )}
          </div>
          <ChevronRight
            className={`h-4 w-4 text-zinc-500 transition-transform ${expanded ? "rotate-90" : ""}`}
          />
        </div>

        {/* Top 3 — yanyana */}
        <div className="flex items-center justify-around gap-1">
          {top3.map((entry, i) => (
            <div
              key={entry.userId}
              className="flex flex-col items-center gap-1"
            >
              <div
                className={`relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full ring-2 ${
                  i === 0
                    ? "ring-amber-400/50"
                    : i === 1
                      ? "ring-zinc-300/40"
                      : "ring-amber-700/40"
                }`}
              >
                <FlagImage flagCode={entry.flagCode} size={36} />
                <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-900 text-[8px]">
                  <RankIcon rank={i + 1} />
                </div>
              </div>
              <span className="text-[10px] font-medium text-zinc-300">{entry.name}</span>
              <span className="flex items-center gap-0.5 text-[9px] text-orange-400/80">
                <Flame className="h-2.5 w-2.5" />
                {entry.streak}
              </span>
            </div>
          ))}
        </div>

        {/* Expanded: diğer sıralamalar */}
        {expanded && (
          <div className="mt-3 space-y-1.5 border-t border-white/[0.06] pt-3">
            {rest.map((entry, i) => (
              <div
                key={entry.userId}
                className="flex items-center justify-between rounded-lg px-2 py-1.5 transition hover:bg-white/[0.03]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-6 w-6 items-center justify-center">
                    <RankIcon rank={i + 4} />
                  </div>
                  <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full">
                    <FlagImage flagCode={entry.flagCode} size={24} />
                  </div>
                  <span className="text-xs font-medium text-zinc-300">{entry.name}</span>
                </div>
                <span className="flex items-center gap-1 text-xs text-orange-400/80">
                  <Flame className="h-3 w-3" />
                  {entry.streak}
                </span>
              </div>
            ))}
            <p className="pt-1 text-center text-[10px] text-zinc-600">
              {data.totalUsers} active users worldwide
            </p>
          </div>
        )}
      </button>
    </div>
  );
}
