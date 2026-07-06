export type ChatTextSegment = { type: "text"; value: string } | { type: "bold"; value: string };

/** Splits coach chat copy into plain and **bold** segments. */
export function splitChatInlineBold(text: string): ChatTextSegment[] {
  const segments: ChatTextSegment[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;

  for (const match of text.matchAll(re)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, index) });
    }
    segments.push({ type: "bold", value: match[1] });
    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: "text", value: text }];
}
