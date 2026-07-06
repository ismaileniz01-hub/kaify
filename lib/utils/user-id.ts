const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

/** Extracts the first UUID from pasted text (strips labels like "ör."). */
export function normalizeUserId(input: string): string | null {
  const match = input.trim().match(UUID_RE);
  return match?.[0]?.toLowerCase() ?? null;
}
