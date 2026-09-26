"use client";

import { useEffect, useRef } from "react";
import { splitChatInlineBold } from "@/lib/chat/inline-bold";
import { coachVisibleMessage } from "@/lib/kaios/envelope-text";
import { useTypedReveal } from "@/lib/chat/typed-reveal";
import { isNearBottom } from "@/lib/chat/scroll-anchor";

export { splitChatInlineBold };

/** Renders coach chat copy with `**bold**` markdown shown as real bold text. */
export function parseChatInlineBold(text: string) {
  return splitChatInlineBold(text).map((seg, i) =>
    seg.type === "bold" ? (
      <strong key={i} className="font-bold">
        {seg.value}
      </strong>
    ) : (
      seg.value
    ),
  );
}

/** Chat copy always wraps: long words and URLs must never widen a bubble. */
const BASE_TEXT_CLASS = "whitespace-pre-wrap break-words [overflow-wrap:anywhere]";

export function ChatMessageText({
  text,
  className = "",
  streaming = false,
  typeIn = false,
}: {
  text: string;
  className?: string;
  streaming?: boolean;
  typeIn?: boolean;
}) {
  const visible = coachVisibleMessage(text);
  const revealed = useTypedReveal(visible, typeIn);
  const catchingUp = typeIn && revealed !== visible;
  const pRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!catchingUp) return;
    const root = pRef.current?.closest("[data-chat-scroller], .overflow-y-auto");
    // Follow the reveal only when the reader is already at the bottom.
    if (root instanceof HTMLElement && isNearBottom(root, 160)) {
      root.scrollTop = root.scrollHeight;
    }
  }, [revealed, catchingUp]);

  if (!visible.trim() && !streaming) return null;
  return (
    <p ref={pRef} className={`${BASE_TEXT_CLASS} ${className}`.trim()}>
      {revealed.trim() ? parseChatInlineBold(revealed) : null}
      {streaming || catchingUp ? (
        <span className="chat-stream-caret" aria-hidden />
      ) : null}
    </p>
  );
}
