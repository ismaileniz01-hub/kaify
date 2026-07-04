"use client";

const STORAGE_KEY = "kaify-referral-code";
const PENDING_REF_KEY = "kaify-pending-referral";

// Unique olması için: 29 karakter (I,O,0,1 çıkarıldı - karışma ihtimali azalsın)
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

/** Store a referral code from ?ref= URL param (guest landing / share links). */
export function captureReferralFromUrl(search?: string | URLSearchParams | null): string | null {
  if (typeof window === "undefined") return null;
  const params =
    search instanceof URLSearchParams
      ? search
      : new URLSearchParams(search ?? window.location.search);
  const raw = params.get("ref")?.trim().toUpperCase();
  if (!raw || raw.length < 4 || raw.length > 12) return null;
  localStorage.setItem(PENDING_REF_KEY, raw);
  return raw;
}

/** Pending referral captured before sign-up (if any). */
export function getPendingReferral(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PENDING_REF_KEY);
}

/** Referral kodunu getir. Yoksa oluştur ve kaydet. */
export function getReferralCode(): string {
  if (typeof window === "undefined") return "......";

  let code = localStorage.getItem(STORAGE_KEY);
  if (!code || code.length !== 6) {
    code = generateCode();
    localStorage.setItem(STORAGE_KEY, code);
  }
  return code;
}

/** Kodu panoya kopyala */
export async function copyReferralCode(): Promise<boolean> {
  const code = getReferralCode();
  try {
    await navigator.clipboard.writeText(code);
    return true;
  } catch {
    return false;
  }
}

/** Kodu paylaş (Web Share API) */
export async function shareReferralCode(): Promise<boolean> {
  const code = getReferralCode();
  const text = `🎫 Join me on Kaify! Use my referral code: ${code}\n\nhttps://kaify.app`;
  
  try {
    if (navigator.share) {
      await navigator.share({ title: "Kaify Referral", text });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}