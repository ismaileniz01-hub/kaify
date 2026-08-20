"use client";

import { useEffect, useRef } from "react";
import { splitChatInlineBold } from "@/lib/chat/inline-bold";
import { coachVisibleMessage } from "@/lib/kaios/envelope-text";
import { useTypedReveal } from "@/lib/chat/typed-reveal";

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

export function ChatMessageText({
  text,
  className = "whitespace-pre-wrap",
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
    if (root instanceof HTMLElement) root.scrollTop = root.scrollHeight;
  }, [revealed, catchingUp]);

  if (!visible.trim() && !streaming) return null;
  return (
    <p ref={pRef} className={className}>
      {revealed.trim() ? parseChatInlineBold(revealed) : null}
      {streaming || catchingUp ? (
        <span className="chat-stream-caret" aria-hidden />
      ) : null}
    </p>
  );
}
