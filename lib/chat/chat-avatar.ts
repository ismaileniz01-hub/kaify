import { DEMO_USER_PROFILE } from "@/lib/user";

/** Brand/demo placeholders are not a person's face; never show them in a thread. */
const PLACEHOLDER_AVATARS = new Set(["/kaify-logo.png", DEMO_USER_PROFILE.avatar]);

export function isChatUserPhoto(src: string | null | undefined): src is string {
  const value = src?.trim() ?? "";
  return value.length > 0 && !PLACEHOLDER_AVATARS.has(value);
}

/** Up to two initials from a display name; empty when the name has no letters. */
export function chatUserInitials(name: string | null | undefined): string {
  const words = (name ?? "")
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
  if (words.length === 0) return "";
  const first = Array.from(words[0])[0];
  const last = words.length > 1 ? Array.from(words[words.length - 1])[0] : "";
  return `${first}${last}`.toLocaleUpperCase();
}
