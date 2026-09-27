const SCORE_HEADER =
  /^(?:scores as observed|gözlenen skorlar|skorlar|puanlar)\s*:?\s*$/i;
const SCORE_BULLET =
  /^[-*•]\s+\**[^\n]{0,48}?\**\s*[—–-]\s*\d{1,3}\**\s*$/;

/** Drop the written muscle list when the bar chart already shows those scores. */
export function stripWrittenScoreDump(text: string): string {
  const kept = text.split("\n").filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return true;
    if (SCORE_HEADER.test(trimmed)) return false;
    if (SCORE_BULLET.test(trimmed)) return false;
    return true;
  });
  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
