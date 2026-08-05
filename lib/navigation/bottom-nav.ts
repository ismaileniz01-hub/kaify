/** Routes where the dock would fight composers, auth, or marketing. */
const HIDDEN_PREFIXES = [
  "/chat",
  "/login",
  "/signup",
  "/pricing",
  "/admin",
  "/onboarding",
] as const;

export function shouldShowBottomNav(pathname: string): boolean {
  return !HIDDEN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
