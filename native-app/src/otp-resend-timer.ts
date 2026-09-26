import {
  NATIVE_PLUGIN_TIMEOUT_MS,
  readWebStorage,
  removeWebStorage,
  withTimeout,
  writeWebStorage,
} from "./boot-storage";

export const DEFAULT_RESEND_AFTER_SECONDS = 60;

const STORAGE_PREFIX = "otp_resend_at:";

/** SHA-256 hex prefix for storage keys — never store plaintext email. */
export async function hashEmailForStorage(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const data = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

export function computeResendAvailableAt(
  resendAfterSeconds: number,
  now = Date.now(),
): number {
  const seconds = Math.max(0, Math.ceil(resendAfterSeconds));
  return now + seconds * 1000;
}

export function remainingResendSeconds(
  resendAvailableAt: number | null | undefined,
  now = Date.now(),
): number {
  if (!resendAvailableAt || !Number.isFinite(resendAvailableAt)) return 0;
  return Math.max(0, Math.ceil((resendAvailableAt - now) / 1000));
}

/** Format as MM:SS for `Kodu tekrar gönder (00:59)`. */
export function formatResendCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function resendButtonLabel(remainingSeconds: number): string {
  if (remainingSeconds > 0) {
    return `Kodu tekrar gönder (${formatResendCountdown(remainingSeconds)})`;
  }
  return "Kodu tekrar gönder";
}

function storageKey(emailHash: string): string {
  return `${STORAGE_PREFIX}${emailHash}`;
}

async function withSecureStorage<T>(
  run: (secure: typeof import("@aparajita/capacitor-secure-storage").SecureStorage) => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    const { SecureStorage } = await import("@aparajita/capacitor-secure-storage");
    return await withTimeout(run(SecureStorage), NATIVE_PLUGIN_TIMEOUT_MS, fallback);
  } catch {
    return fallback;
  }
}

export async function persistResendAvailableAt(
  email: string,
  resendAvailableAt: number,
): Promise<void> {
  const hash = await hashEmailForStorage(email);
  const key = storageKey(hash);
  const value = String(resendAvailableAt);
  writeWebStorage(key, value);
  await withSecureStorage(
    (secure) => secure.setItem(key, value),
    undefined,
  );
}

export async function loadResendAvailableAt(
  email: string,
): Promise<number | null> {
  try {
    const hash = await hashEmailForStorage(email);
    const key = storageKey(hash);
    const local = readWebStorage(key);
    const raw =
      local ??
      (await withSecureStorage(
        (secure) => secure.getItem(key).then((item) => item ?? null),
        null,
      ));
    if (!raw) return null;
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) return null;
    return value;
  } catch {
    return null;
  }
}

export async function clearResendAvailableAt(email: string): Promise<void> {
  try {
    const hash = await hashEmailForStorage(email);
    const key = storageKey(hash);
    removeWebStorage(key);
    await withSecureStorage((secure) => secure.removeItem(key), undefined);
  } catch {
    // ignore
  }
}
