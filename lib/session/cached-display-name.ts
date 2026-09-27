const DISPLAY_NAME_KEY = "kaify-display-name";

export function readCachedDisplayName(): string {
  if (typeof localStorage === "undefined") return "";
  try {
    return localStorage.getItem(DISPLAY_NAME_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function writeCachedDisplayName(name: string): void {
  const trimmed = name.trim();
  if (!trimmed || trimmed === "Joe") return;
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(DISPLAY_NAME_KEY, trimmed);
  } catch {
    // private mode
  }
}

export function clearCachedDisplayName(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(DISPLAY_NAME_KEY);
  } catch {
    // private mode
  }
}

/** Name baked into the Supabase access token, available before /api/session returns. */
export function nameFromAccessToken(token: string | null | undefined): string {
  if (!token) return "";
  const part = token.split(".")[1];
  if (!part) return "";
  try {
    const padded = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(padded)) as {
      user_metadata?: { display_name?: string; full_name?: string; name?: string };
    };
    const meta = json.user_metadata;
    const name = meta?.display_name || meta?.full_name || meta?.name || "";
    return typeof name === "string" ? name.trim() : "";
  } catch {
    return "";
  }
}
