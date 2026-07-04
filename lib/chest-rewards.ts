export type ChestRarity = "common" | "rare" | "ultra_rare" | "epic" | "legendary";

export type ChestRewardKind = "gems" | "freezie";

export type ChestRewardDef = {
  kind: ChestRewardKind;
  amount: number;
  labelKey: string;
  rarity: ChestRarity;
  rarityKey: string;
};

/** Ordered cycle: 5 → 30 gems (×5), then legendary freezie. */
export const CHEST_REEL_CYCLE: ChestRewardDef[] = [
  { kind: "gems", amount: 5, labelKey: "chest.reward.gems_5", rarity: "common", rarityKey: "chest.rarity.common" },
  { kind: "gems", amount: 10, labelKey: "chest.reward.gems_10", rarity: "rare", rarityKey: "chest.rarity.rare" },
  { kind: "gems", amount: 15, labelKey: "chest.reward.gems_15", rarity: "ultra_rare", rarityKey: "chest.rarity.ultra_rare" },
  { kind: "gems", amount: 20, labelKey: "chest.reward.gems_20", rarity: "epic", rarityKey: "chest.rarity.epic" },
  { kind: "gems", amount: 25, labelKey: "chest.reward.gems_25", rarity: "epic", rarityKey: "chest.rarity.epic" },
  { kind: "gems", amount: 30, labelKey: "chest.reward.gems_30", rarity: "epic", rarityKey: "chest.rarity.epic" },
  { kind: "freezie", amount: 1, labelKey: "chest.reward.freezie_1", rarity: "legendary", rarityKey: "chest.rarity.legendary" },
];

export const CHEST_REWARD_POOL: { reward: ChestRewardDef; weight: number }[] = [
  { reward: CHEST_REEL_CYCLE[0], weight: 26 },
  { reward: CHEST_REEL_CYCLE[1], weight: 22 },
  { reward: CHEST_REEL_CYCLE[2], weight: 18 },
  { reward: CHEST_REEL_CYCLE[3], weight: 14 },
  { reward: CHEST_REEL_CYCLE[4], weight: 10 },
  { reward: CHEST_REEL_CYCLE[5], weight: 6 },
  { reward: CHEST_REEL_CYCLE[6], weight: 4 },
];

export type ChestRewardDTO = ChestRewardDef;
export type ChestReelSlot = ChestRewardDef;

export function rollChestReward(): ChestRewardDef {
  const total = CHEST_REWARD_POOL.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const entry of CHEST_REWARD_POOL) {
    r -= entry.weight;
    if (r <= 0) return { ...entry.reward };
  }
  return { ...CHEST_REEL_CYCLE[0] };
}

/** Repeating ordered reel — cycle loops 5→10→…→freezie→5→… */
export function buildLoopingReel(
  winner: ChestRewardDef,
  opts?: { cycles?: number; stopIndex?: number },
): { reel: ChestReelSlot[]; stopIndex: number } {
  const cycleLen = CHEST_REEL_CYCLE.length;
  const cycles = opts?.cycles ?? 6;
  const stopIndex = opts?.stopIndex ?? cycles * cycleLen - 3;
  const total = cycles * cycleLen;

  const reel: ChestReelSlot[] = [];
  for (let i = 0; i < total; i++) {
    if (i === stopIndex) {
      reel.push({ ...winner });
    } else {
      reel.push({ ...CHEST_REEL_CYCLE[i % cycleLen] });
    }
  }
  return { reel, stopIndex };
}

export function rarityCardStyles(rarity: ChestRarity): {
  card: string;
  ring: string;
  glow: string;
  label: string;
} {
  switch (rarity) {
    case "legendary":
      return {
        card: "border-cyan-300/70 bg-gradient-to-b from-cyan-900/55 via-violet-900/45 to-amber-950/50 shadow-[0_0_28px_rgba(34,211,238,0.35)]",
        ring: "ring-cyan-300/80",
        glow: "bg-cyan-400/25",
        label: "text-cyan-200",
      };
    case "epic":
      return {
        card: "border-amber-400/65 bg-gradient-to-b from-amber-900/55 to-amber-950/45 shadow-[0_0_24px_rgba(251,191,36,0.35)]",
        ring: "ring-amber-300/75",
        glow: "bg-amber-400/20",
        label: "text-amber-300",
      };
    case "ultra_rare":
      return {
        card: "border-fuchsia-400/55 bg-gradient-to-b from-fuchsia-900/50 to-purple-950/45 shadow-[0_0_20px_rgba(217,70,239,0.3)]",
        ring: "ring-fuchsia-400/70",
        glow: "bg-fuchsia-400/20",
        label: "text-fuchsia-300",
      };
    case "rare":
      return {
        card: "border-sky-400/55 bg-gradient-to-b from-sky-900/50 to-blue-950/45 shadow-[0_0_18px_rgba(56,189,248,0.28)]",
        ring: "ring-sky-400/65",
        glow: "bg-sky-400/18",
        label: "text-sky-300",
      };
    default:
      return {
        card: "border-zinc-500/50 bg-gradient-to-b from-zinc-700/55 to-zinc-900/55 shadow-[0_0_8px_rgba(161,161,170,0.15)]",
        ring: "ring-zinc-400/50",
        glow: "bg-zinc-400/10",
        label: "text-zinc-400",
      };
  }
}

export type ChestRevealSound =
  | "chestRevealCommon"
  | "chestRevealRare"
  | "chestRevealUltraRare"
  | "chestRevealEpic"
  | "chestRevealLegendary";

export function revealSoundForRarity(rarity: ChestRarity): ChestRevealSound {
  switch (rarity) {
    case "legendary":
      return "chestRevealLegendary";
    case "epic":
      return "chestRevealEpic";
    case "ultra_rare":
      return "chestRevealUltraRare";
    case "rare":
      return "chestRevealRare";
    default:
      return "chestRevealCommon";
  }
}
