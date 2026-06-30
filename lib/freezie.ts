"use client";

const BALANCE_KEY = "kaify-freezie-balance";
const CLAIMED_DAYS_KEY = "kaify-freezie-claimed-days";
const LAST_VISIT_KEY = "kaify-streak-last-visit";

/** Freezie bakiyesini getir */
export function getFreezieBalance(): number {
  if (typeof window === "undefined") return 0;
  return Number(localStorage.getItem(BALANCE_KEY)) || 0;
}

/** Freezie bakiye kaydet */
function setFreezieBalance(val: number) {
  localStorage.setItem(BALANCE_KEY, String(val));
}

/** Daha önce claim edilmiş günleri getir */
function getClaimedDays(): number[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(CLAIMED_DAYS_KEY);
  return raw ? JSON.parse(raw) : [];
}

/** Claim edilmiş günleri kaydet */
function setClaimedDays(days: number[]) {
  localStorage.setItem(CLAIMED_DAYS_KEY, JSON.stringify(days));
}

/** Streak 7'nin katıysa ve daha önce claim edilmemişse freezie ekle */
export function claimFreezie(currentStreak: number): boolean {
  if (currentStreak <= 0 || currentStreak % 7 !== 0) return false;

  const claimed = getClaimedDays();
  if (claimed.includes(currentStreak)) return false; // zaten alınmış

  claimFreezieAmount(1);
  setClaimedDays([...claimed, currentStreak]);
  return true;
}

/** Belli miktar freezie ekle (claim iç ve dış) */
function claimFreezieAmount(amount: number) {
  const balance = getFreezieBalance();
  setFreezieBalance(balance + amount);
}

/** Freezie harca (1 tane) — başarılıysa true */
function spendFreezie(): boolean {
  const balance = getFreezieBalance();
  if (balance <= 0) return false;
  setFreezieBalance(balance - 1);
  return true;
}

/** 
 * Otomatik streak koruma - kullanıcı gün atlamışsa freezie varsa harca.
 * currentStreak: şu anki streak değeri
 * returns: { newStreak, freezieUsed } 
 */
export function autoProtectStreak(currentStreak: number): { newStreak: number; freezieUsed: boolean } {
  const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
  const today = new Date().toDateString();

  // İlk ziyaret
  if (!lastVisit) {
    localStorage.setItem(LAST_VISIT_KEY, today);
    return { newStreak: currentStreak, freezieUsed: false };
  }

  // Aynı gün tekrar ziyaret - sorun yok
  if (lastVisit === today) {
    return { newStreak: currentStreak, freezieUsed: false };
  }

  // Bir gün atlanmış mı kontrol et
  const lastDate = new Date(lastVisit);
  const todayDate = new Date(today);
  const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  // Aynı gün veya sadece 1 gün geçmiş (sorun yok)
  if (diffDays <= 1) {
    localStorage.setItem(LAST_VISIT_KEY, today);
    return { newStreak: currentStreak, freezieUsed: false };
  }

  // Gün atlanmış! Freezie varsa kullan
  const freezieBalance = getFreezieBalance();
  if (freezieBalance > 0) {
    spendFreezie();
    localStorage.setItem(LAST_VISIT_KEY, today);
    return { newStreak: currentStreak, freezieUsed: true }; // streak aynen korunur
  }

  // Freezie yok - streak normal sıfırlanır (1'den başlat)
  localStorage.setItem(LAST_VISIT_KEY, today);
  return { newStreak: 1, freezieUsed: false };
}

/** Son ziyaret gününü kaydet (manuel) */
export function updateLastVisit() {
  localStorage.setItem(LAST_VISIT_KEY, new Date().toDateString());
}

/** 7'nin katı olan günleri döndür (streak'e kadar) */
export function getFreezieMilestones(currentStreak: number): number[] {
  const milestones: number[] = [];
  for (let i = 7; i <= currentStreak; i += 7) {
    milestones.push(i);
  }
  return milestones;
}