/** Unwrap KAIOS envelopes so cards read ui/data the same way as the snapshot. */

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function unwrapChatCardPayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const data = asRecord(payload.data);
  const ui = asRecord(payload.ui);
  return { ...payload, ...(data ?? {}), ...(ui ?? {}) };
}

export function looksLikeI18nKey(value: string): boolean {
  return /^[a-z][a-z0-9]*(\.[a-z0-9_]+)+$/i.test(value.trim());
}

function stringField(
  rec: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = rec[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function planDayHeading(day: Record<string, unknown>): {
  day?: string;
  focus?: string;
} {
  const focus =
    stringField(day, "focus") ??
    stringField(day, "name") ??
    stringField(day, "title") ??
    stringField(day, "focusKey");
  const dayLabel = stringField(day, "dayKey");
  return { day: dayLabel, focus };
}

export function displayPlanLabel(
  raw: string | undefined,
  translate: (key: string) => string,
): string {
  if (!raw) return "";
  if (looksLikeI18nKey(raw)) return translate(raw);
  return raw.replace(/^workout\./i, "").replace(/_/g, " ");
}
