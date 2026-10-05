import type { HomeDTO } from "@/lib/services/home.service";
import type { GemBalanceDTO } from "@/lib/services/gem-balance.service";
import type { KaiStateDTO } from "@/lib/services/kai-state.service";
import type { StreakStatusDTO } from "@/lib/services/streak-status.service";
import type { ProfileDTO } from "@/lib/types/domain.types";

const PAINT_KEY = "kaify:home-paint:v1";
const UNREAD_KEY = "kaify:notif-unread:v1";
/** Last open is enough to skip the empty shell. Older snapshots are dropped. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type HomePaintSnapshot = {
  v: 1;
  savedAt: number;
  profile: ProfileDTO;
  gems: GemBalanceDTO;
  streak: StreakStatusDTO;
  home: HomeDTO;
  kai: KaiStateDTO | null;
  referralCode: string;
  isAdmin: boolean;
};

function storage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

function isSnapshot(value: unknown): value is HomePaintSnapshot {
  if (!value || typeof value !== "object") return false;
  const row = value as HomePaintSnapshot;
  return (
    row.v === 1 &&
    typeof row.savedAt === "number" &&
    typeof row.profile?.displayName === "string" &&
    typeof row.gems?.balance === "number" &&
    typeof row.streak?.currentStreak === "number" &&
    typeof row.home?.stats?.streak === "number" &&
    typeof row.referralCode === "string" &&
    typeof row.isAdmin === "boolean"
  );
}

/** Last home screen the device painted. Null when missing, stale, or corrupt. */
export function readHomePaint(): HomePaintSnapshot | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(PAINT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isSnapshot(parsed)) {
      store.removeItem(PAINT_KEY);
      return null;
    }
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      store.removeItem(PAINT_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeHomePaint(
  snapshot: Omit<HomePaintSnapshot, "v" | "savedAt">,
): void {
  const store = storage();
  if (!store) return;
  const next: HomePaintSnapshot = { v: 1, savedAt: Date.now(), ...snapshot };
  try {
    store.setItem(PAINT_KEY, JSON.stringify(next));
  } catch {
    // Quota or private mode — the network refresh still paints the screen.
  }
}

export function readCachedUnreadCount(): number {
  const store = storage();
  if (!store) return 0;
  const n = Number(store.getItem(UNREAD_KEY));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(99, Math.floor(n));
}

export function writeCachedUnreadCount(count: number): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(UNREAD_KEY, String(Math.max(0, Math.floor(count))));
  } catch {
    // ignore quota
  }
}

export function clearHomePaint(): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(PAINT_KEY);
    store.removeItem(UNREAD_KEY);
  } catch {
    // ignore
  }
}
