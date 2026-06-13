"use client";

import { ScrollReveal } from "./ScrollReveal";
import { Trophy, Flame, TrendingUp, Globe } from "lucide-react";

const COUNTRIES = [
  {
    rank: 1,
    flagCode: "tr",
    name: "Türkiye",
    users: "12.4K",
    totalStreaks: 284_500,
    color: "#f97316",
    glow: "rgba(249, 115, 22, 0.35)",
  },
  {
    rank: 2,
    flagCode: "us",
    name: "United States",
    users: "9.8K",
    totalStreaks: 212_300,
    color: "#3b82f6",
    glow: "rgba(59, 130, 246, 0.35)",
  },
  {
    rank: 3,
    flagCode: "br",
    name: "Brazil",
    users: "7.2K",
    totalStreaks: 158_900,
    color: "#22c55e",
    glow: "rgba(34, 197, 94, 0.35)",
  },
  {
    rank: 4,
    flagCode: "de",
    name: "Germany",
    users: "5.1K",
    totalStreaks: 112_400,
    color: "#a855f7",
    glow: "rgba(168, 85, 247, 0.35)",
  },
  {
    rank: 5,
    flagCode: "gb",
    name: "United Kingdom",
    users: "3.6K",
    totalStreaks: 79_800,
    color: "#fbbf24",
    glow: "rgba(251, 191, 36, 0.35)",
  },
];

// Floating flag orbs scattered around the card — positioned outside on left & right
// Left side: leaderboard countries, Right side: developed / high-population nations
const FLOATING_FLAGS = [
  { flagCode: "tr", x: "-8%", y: "10%", size: 56, delay: 0, duration: 6 },
  { flagCode: "es", x: "104%", y: "5%", size: 52, delay: 0.8, duration: 7 },
  { flagCode: "br", x: "-10%", y: "38%", size: 44, delay: 1.6, duration: 5.5 },
  { flagCode: "ca", x: "106%", y: "35%", size: 50, delay: 2.4, duration: 6.5 },
  { flagCode: "gb", x: "-7%", y: "68%", size: 46, delay: 3.2, duration: 5 },
  { flagCode: "jp", x: "103%", y: "65%", size: 42, delay: 0.4, duration: 7.5 },
  { flagCode: "us", x: "-12%", y: "90%", size: 38, delay: 1.2, duration: 6.2 },
  { flagCode: "in", x: "108%", y: "88%", size: 40, delay: 2, duration: 5.8 },
];

function FlagImage({ flagCode, size = 40 }: { flagCode: string; size?: number }) {
  return (
    <img
      src={`https://flagcdn.com/w80/${flagCode}.png`}
      srcSet={`https://flagcdn.com/w40/${flagCode}.png 1x, https://flagcdn.com/w80/${flagCode}.png 2x`}
      alt=""
      width={size}
      height={size * 0.6}
      className="h-full w-full object-cover"
      style={flagCode === "tr" ? { objectPosition: "35% center" } : undefined}
      loading="lazy"
    />
  );
}

function FloatingFlag({
  flagCode,
  x,
  y,
  size,
  delay,
  duration,
}: {
  flagCode: string;
  x: string;
  y: string;
  size: number;
  delay: number;
  duration: number;
}) {
  return (
    <div
      className="landing-flag-orb"
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    >
      <div className="h-5 w-5 overflow-hidden rounded-full">
        <FlagImage flagCode={flagCode} size={20} />
      </div>
    </div>
  );
}

function CountryRow({
  country,
  index,
}: {
  country: (typeof COUNTRIES)[number];
  index: number;
}) {
  const isTop = country.rank <= 3;

  return (
    <ScrollReveal delay={index * 80} direction="up">
      <div
        className="landing-leaderboard-row group my-2 rounded-xl border border-white/[0.06] bg-white/[0.01]"
        style={
          {
            "--row-color": country.color,
            "--row-glow": country.glow,
          } as React.CSSProperties
        }
      >
        {/* Rank badge */}
        <div className="landing-leaderboard-rank">
          {isTop ? (
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{
                background: `color-mix(in srgb, ${country.color} 20%, transparent)`,
                boxShadow: `0 0 20px ${country.glow}`,
              }}
            >
              <Trophy
                className={`h-5 w-5 ${
                  country.rank === 1
                    ? "text-amber-400"
                    : country.rank === 2
                      ? "text-zinc-300"
                      : "text-amber-700"
                }`}
                fill="currentColor"
              />
            </div>
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.04] text-sm font-bold text-zinc-500">
              {country.rank}
            </div>
          )}
        </div>

        {/* Flag + Name */}
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.04] ring-1 ring-white/[0.08]">
            <FlagImage flagCode={country.flagCode} size={56} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {country.name}
            </p>
            <p className="text-xs text-zinc-500">{country.users} active users</p>
          </div>
        </div>

        {/* Streak count */}
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1.5 ring-1 ring-orange-500/20">
            <Flame className="h-3.5 w-3.5 text-orange-400" />
            <span className="text-sm font-bold tabular-nums text-white">
              {(country.totalStreaks / 1000).toFixed(1)}K
            </span>
          </div>
        </div>
      </div>
    </ScrollReveal>
  );
}

export function LandingLeaderboard() {
  return (
    <section id="leaderboard" className="landing-section relative">
      {/* Background glow */}
      <div className="landing-section-glow landing-section-glow--amber" aria-hidden />
      <div
        className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-[100px]"
        style={{ background: "radial-gradient(circle, rgba(251,191,36,0.25), transparent)" }}
        aria-hidden
      />

      <div className="landing-container">
        <ScrollReveal className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-4 py-1.5 ring-1 ring-amber-500/20">
            <Globe className="h-4 w-4 text-amber-400" />
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-400/80">
              Global Leaderboard
            </p>
          </div>
          <h2 className="landing-section-title mt-4">
            Which country{" "}
            <span className="landing-gradient-text">stays strongest?</span>
          </h2>
          <p className="mt-6 text-lg text-zinc-400">
            The more users track their streaks in a country, the higher it climbs.
            Where does your nation rank?
          </p>
        </ScrollReveal>

        <div className="relative mx-auto mt-12 max-w-2xl sm:mt-16">
          {/* Floating flag orbs scattered around */}
          <div className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
            {FLOATING_FLAGS.map((f, i) => (
              <FloatingFlag key={i} {...f} />
            ))}
          </div>

          {/* Leaderboard card */}
          <div className="landing-leaderboard-card relative z-10">
            {/* Header */}
            <div className="mb-2 flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Top Countries
                </span>
              </div>
              <span className="text-xs font-medium text-zinc-600">
                Total Streaks
              </span>
            </div>

            {COUNTRIES.map((country, i) => (
              <CountryRow key={country.name} country={country} index={i} />
            ))}
          </div>

          <p className="mt-6 text-center text-xs text-zinc-600">
            Live rankings update daily based on total active streak days per country.
          </p>
        </div>
      </div>
    </section>
  );
}
