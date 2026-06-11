/** Kai'nin streak seviyesine göre avatar yolunu döndürür */

export type KaiLevel = 1 | 2 | 3 | 4;

export const KAI_LEVEL_AVATARS: Record<KaiLevel, string> = {
  1: "/avatars/kai-level-1.png",
  2: "/avatars/kai-level-2.png",
  3: "/avatars/kai-level-3.png",
  4: "/avatars/kai-level-4.png",
};

export const KAI_LEVEL_THRESHOLDS: { level: KaiLevel; minStreak: number; label: string }[] = [
  { level: 1, minStreak: 0, label: "Başlangıç" },
  { level: 2, minStreak: 31, label: "Kıdemli" },
  { level: 3, minStreak: 61, label: "Efsane" },
  { level: 4, minStreak: 120, label: "Hedef" },
];

/** Streak gün sayısına göre Kai'nin level'ını hesaplar */
export function getKaiLevel(streak: number): KaiLevel {
  if (streak >= 120) return 4;
  if (streak >= 61) return 3;
  if (streak >= 31) return 2;
  return 1;
}

/** Streak gün sayısına göre Kai'nin avatar yolunu döndürür */
export function getKaiAvatar(streak: number): string {
  const level = getKaiLevel(streak);
  return KAI_LEVEL_AVATARS[level];
}

/** Kai'nin mevcut level bilgisini döndürür */
export function getKaiLevelInfo(streak: number) {
  const level = getKaiLevel(streak);
  const current = KAI_LEVEL_THRESHOLDS.find((t) => t.level === level)!;
  const next = KAI_LEVEL_THRESHOLDS.find((t) => t.level === level + 1) ?? null;

  return {
    level,
    label: current.label,
    avatar: KAI_LEVEL_AVATARS[level],
    nextLevelAt: next?.minStreak ?? null,
    nextLevelLabel: next?.label ?? null,
  };
}
