const EXEMPT_PREFIXES = [
  "/signup",
  "/myaccount",
  "/settings",
  "/delete-account",
] as const;

/** Onboarding modal must not block billing, account deletion, or signup. */
export function isOnboardingExemptPath(pathname: string): boolean {
  return EXEMPT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
