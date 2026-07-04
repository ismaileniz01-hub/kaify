import type { AuraColor } from "@/lib/kai-context";

export type MarketEffect = {
  id: AuraColor;
  nameKey: string;
  price: number;
  gradient: string;
  borderColor: string;
  glowColor: string;
  ringColor: string;
  sparkColor: string;
  bgGradient: string;
};

/** Shared aura effect catalog for market / trophy-road UI. */
export const MARKET_EFFECTS: MarketEffect[] = [
  {
    id: "blue",
    nameKey: "market.effect.blue",
    price: 300,
    gradient: "from-cyan-400 to-blue-500",
    borderColor: "border-cyan-400/50",
    glowColor: "shadow-cyan-500/40",
    ringColor: "bg-cyan-400",
    sparkColor: "text-cyan-300",
    bgGradient: "from-cyan-900/30 via-transparent to-blue-900/20",
  },
  {
    id: "red",
    nameKey: "market.effect.red",
    price: 300,
    gradient: "from-red-500 to-orange-500",
    borderColor: "border-red-400/50",
    glowColor: "shadow-red-500/40",
    ringColor: "bg-red-400",
    sparkColor: "text-red-300",
    bgGradient: "from-red-900/30 via-transparent to-orange-900/20",
  },
  {
    id: "green",
    nameKey: "market.effect.green",
    price: 300,
    gradient: "from-emerald-400 to-green-500",
    borderColor: "border-emerald-400/50",
    glowColor: "shadow-emerald-500/40",
    ringColor: "bg-emerald-400",
    sparkColor: "text-emerald-300",
    bgGradient: "from-emerald-900/30 via-transparent to-green-900/20",
  },
  {
    id: "pink",
    nameKey: "market.effect.pink",
    price: 300,
    gradient: "from-pink-400 to-rose-500",
    borderColor: "border-pink-400/50",
    glowColor: "shadow-pink-500/40",
    ringColor: "bg-pink-400",
    sparkColor: "text-pink-300",
    bgGradient: "from-pink-900/30 via-transparent to-rose-900/20",
  },
  {
    id: "purple",
    nameKey: "market.effect.purple",
    price: 300,
    gradient: "from-purple-400 to-violet-500",
    borderColor: "border-purple-400/50",
    glowColor: "shadow-purple-500/40",
    ringColor: "bg-purple-400",
    sparkColor: "text-purple-300",
    bgGradient: "from-purple-900/30 via-transparent to-violet-900/20",
  },
  {
    id: "gold",
    nameKey: "market.effect.gold",
    price: 300,
    gradient: "from-yellow-400 to-amber-500",
    borderColor: "border-yellow-400/50",
    glowColor: "shadow-yellow-500/40",
    ringColor: "bg-yellow-400",
    sparkColor: "text-yellow-300",
    bgGradient: "from-yellow-900/30 via-transparent to-amber-900/20",
  },
  {
    id: "white",
    nameKey: "market.effect.white",
    price: 300,
    gradient: "from-white/80 to-zinc-300",
    borderColor: "border-white/30",
    glowColor: "shadow-white/20",
    ringColor: "bg-white/60",
    sparkColor: "text-white",
    bgGradient: "from-zinc-800/30 via-transparent to-zinc-900/20",
  },
  {
    id: "orange",
    nameKey: "market.effect.orange",
    price: 300,
    gradient: "from-orange-400 to-red-500",
    borderColor: "border-orange-400/50",
    glowColor: "shadow-orange-500/40",
    ringColor: "bg-orange-400",
    sparkColor: "text-orange-300",
    bgGradient: "from-orange-900/30 via-transparent to-red-900/20",
  },
  {
    id: "indigo",
    nameKey: "market.effect.indigo",
    price: 300,
    gradient: "from-indigo-400 to-blue-600",
    borderColor: "border-indigo-400/50",
    glowColor: "shadow-indigo-500/40",
    ringColor: "bg-indigo-400",
    sparkColor: "text-indigo-300",
    bgGradient: "from-indigo-900/30 via-transparent to-blue-900/20",
  },
  {
    id: "electric",
    nameKey: "market.effect.electric",
    price: 400,
    gradient: "from-sky-400 to-cyan-500",
    borderColor: "border-sky-400/50",
    glowColor: "shadow-sky-500/40",
    ringColor: "bg-sky-400",
    sparkColor: "text-sky-300",
    bgGradient: "from-sky-900/30 via-transparent to-cyan-900/20",
  },
];
