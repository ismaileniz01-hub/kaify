"use client";

const STORAGE_KEY = "kaify-referral-code";

// Unique olması için: 29 karakter (I,O,0,1 çıkarıldı - karışma ihtimali azalsın)
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
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