/** Same-origin path only — blocks open-redirect via protocol-relative URLs. */
export function sanitizeAuthRedirect(
  next: string | null | undefined,
  fallback = "/welcome",
): string {
  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

export type AuthMode = "signin" | "signup";

export function parseAuthMode(value: string | null | undefined): AuthMode {
  return value === "signup" ? "signup" : "signin";
}
