import type { CSSProperties } from "react";
import type { AuraColor } from "@/lib/kai-context";

export type AvatarEffect =
  | "none"
  | "fire"
  | "electric"
  | "phoenix"
  | "nebula"
  | "thunder"
  | "eclipse"
  | "prism";

export type AuraVisualConfig = {
  effect: AvatarEffect;
  primary: string;
  secondary: string;
  tailwindSpark: string;
  tailwindRing: string;
  tailwindShadow: string;
};

/** Premium tier — distinct multi-layer CSS effects. */
export const PREMIUM_AURA_IDS = [
  "phoenix",
  "nebula",
  "thunder",
  "eclipse",
  "prism",
] as const;

export type PremiumAuraId = (typeof PREMIUM_AURA_IDS)[number];

export function isPremiumAura(id: string): id is PremiumAuraId {
  return (PREMIUM_AURA_IDS as readonly string[]).includes(id);
}

const AURA_VISUALS: Record<Exclude<AuraColor, "default">, AuraVisualConfig> = {
  blue: {
    effect: "fire",
    primary: "#67e8f9",
    secondary: "#3b82f6",
    tailwindSpark: "text-cyan-300",
    tailwindRing: "bg-cyan-400",
    tailwindShadow: "shadow-cyan-500/40",
  },
  red: {
    effect: "fire",
    primary: "#fca5a5",
    secondary: "#ef4444",
    tailwindSpark: "text-red-300",
    tailwindRing: "bg-red-400",
    tailwindShadow: "shadow-red-500/40",
  },
  green: {
    effect: "fire",
    primary: "#6ee7b7",
    secondary: "#22c55e",
    tailwindSpark: "text-emerald-300",
    tailwindRing: "bg-emerald-400",
    tailwindShadow: "shadow-emerald-500/40",
  },
  pink: {
    effect: "fire",
    primary: "#f9a8d4",
    secondary: "#ec4899",
    tailwindSpark: "text-pink-300",
    tailwindRing: "bg-pink-400",
    tailwindShadow: "shadow-pink-500/40",
  },
  purple: {
    effect: "fire",
    primary: "#d8b4fe",
    secondary: "#a855f7",
    tailwindSpark: "text-purple-300",
    tailwindRing: "bg-purple-400",
    tailwindShadow: "shadow-purple-500/40",
  },
  gold: {
    effect: "fire",
    primary: "#fde047",
    secondary: "#eab308",
    tailwindSpark: "text-yellow-300",
    tailwindRing: "bg-yellow-400",
    tailwindShadow: "shadow-yellow-500/40",
  },
  white: {
    effect: "fire",
    primary: "#ffffff",
    secondary: "#e4e4e7",
    tailwindSpark: "text-white",
    tailwindRing: "bg-white/60",
    tailwindShadow: "shadow-white/30",
  },
  orange: {
    effect: "fire",
    primary: "#fdba74",
    secondary: "#f97316",
    tailwindSpark: "text-orange-300",
    tailwindRing: "bg-orange-400",
    tailwindShadow: "shadow-orange-500/40",
  },
  indigo: {
    effect: "fire",
    primary: "#a5b4fc",
    secondary: "#6366f1",
    tailwindSpark: "text-indigo-300",
    tailwindRing: "bg-indigo-400",
    tailwindShadow: "shadow-indigo-500/40",
  },
  electric: {
    effect: "electric",
    primary: "#7dd3fc",
    secondary: "#38bdf8",
    tailwindSpark: "text-sky-300",
    tailwindRing: "bg-sky-400",
    tailwindShadow: "shadow-sky-500/40",
  },
  phoenix: {
    effect: "phoenix",
    primary: "#ff6b00",
    secondary: "#ffd700",
    tailwindSpark: "text-orange-300",
    tailwindRing: "bg-orange-500",
    tailwindShadow: "shadow-orange-500/50",
  },
  nebula: {
    effect: "nebula",
    primary: "#e879f9",
    secondary: "#6366f1",
    tailwindSpark: "text-fuchsia-300",
    tailwindRing: "bg-fuchsia-500",
    tailwindShadow: "shadow-fuchsia-500/50",
  },
  thunder: {
    effect: "thunder",
    primary: "#e0f2fe",
    secondary: "#0ea5e9",
    tailwindSpark: "text-sky-200",
    tailwindRing: "bg-sky-300",
    tailwindShadow: "shadow-sky-400/60",
  },
  eclipse: {
    effect: "eclipse",
    primary: "#fbbf24",
    secondary: "#581c87",
    tailwindSpark: "text-amber-300",
    tailwindRing: "bg-purple-900",
    tailwindShadow: "shadow-amber-500/40",
  },
  prism: {
    effect: "prism",
    primary: "#22d3ee",
    secondary: "#f472b6",
    tailwindSpark: "text-cyan-300",
    tailwindRing: "bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-yellow-400",
    tailwindShadow: "shadow-cyan-400/40",
  },
};

const DEFAULT_VISUAL: AuraVisualConfig = {
  effect: "fire",
  primary: "#d8b4fe",
  secondary: "#a855f7",
  tailwindSpark: "text-purple-300",
  tailwindRing: "bg-purple-400",
  tailwindShadow: "shadow-purple-500/40",
};

export function getAuraVisual(auraColor: AuraColor): AuraVisualConfig {
  if (auraColor === "default") return DEFAULT_VISUAL;
  return AURA_VISUALS[auraColor] ?? DEFAULT_VISUAL;
}

export function resolveAvatarEffect(auraColor: AuraColor): AvatarEffect {
  if (auraColor === "default") return "none";
  return getAuraVisual(auraColor).effect;
}

export function auraCssVars(config: AuraVisualConfig): CSSProperties {
  return {
    "--aura-primary": config.primary,
    "--aura-secondary": config.secondary,
    "--spark-color": config.primary,
  } as CSSProperties;
}
