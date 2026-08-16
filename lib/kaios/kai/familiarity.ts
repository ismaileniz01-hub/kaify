/**
 * Minimal deterministic Kai familiarity stage from existing product signals.
 * If signals are insufficient → "unknown" (capsule must not invent stage).
 */

export type KaiFamiliarityStage =
  | "new"
  | "developing"
  | "established"
  | "long_term"
  | "unknown";

export function resolveKaiFamiliarityStage(input: {
  accountCreatedAt?: string | null;
  directMessageCount?: number | null;
}): KaiFamiliarityStage {
  const count =
    typeof input.directMessageCount === "number" &&
    Number.isFinite(input.directMessageCount)
      ? Math.max(0, input.directMessageCount)
      : null;

  let ageDays: number | null = null;
  if (input.accountCreatedAt) {
    const t = Date.parse(input.accountCreatedAt);
    if (Number.isFinite(t)) {
      ageDays = Math.max(0, (Date.now() - t) / (1000 * 60 * 60 * 24));
    }
  }

  if (count == null && ageDays == null) return "unknown";

  if ((count != null && count < 12) || (ageDays != null && ageDays < 7)) {
    return "new";
  }
  if ((count != null && count < 40) || (ageDays != null && ageDays < 30)) {
    return "developing";
  }
  if ((count != null && count < 120) || (ageDays != null && ageDays < 90)) {
    return "established";
  }
  return "long_term";
}
