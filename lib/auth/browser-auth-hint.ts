/** Browser hint that a Supabase auth cookie is present (no JWT parse). */
export function hasBrowserAuthCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((part) => {
    const name = part.trim();
    return name.includes("auth-token") || (name.startsWith("sb-") && name.includes("auth"));
  });
}
