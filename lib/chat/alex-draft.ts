const ALEX_DRAFT_KEY = "kaify-alex-draft";

export function setAlexDraft(text: string): void {
  if (typeof sessionStorage === "undefined") return;
  const trimmed = text.trim();
  if (!trimmed) return;
  sessionStorage.setItem(ALEX_DRAFT_KEY, trimmed);
}

export function consumeAlexDraft(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  const value = sessionStorage.getItem(ALEX_DRAFT_KEY);
  sessionStorage.removeItem(ALEX_DRAFT_KEY);
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}
