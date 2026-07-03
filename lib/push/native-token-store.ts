"use client";

/** Shared token bridge between CapacitorShell (listener) and native-client. */

const TOKEN_KEY = "kaify_native_push_token";

let pendingResolve: ((token: string) => void) | null = null;

export function getStoredNativeToken(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setStoredNativeToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
  pendingResolve?.(token);
  pendingResolve = null;
}

export function clearStoredNativeToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

/** Waits for the next FCM registration event (or returns cached token). */
export function waitForNativeToken(timeoutMs = 8000): Promise<string | null> {
  const cached = getStoredNativeToken();
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pendingResolve = null;
      resolve(getStoredNativeToken());
    }, timeoutMs);

    pendingResolve = (token) => {
      clearTimeout(timer);
      resolve(token);
    };
  });
}
