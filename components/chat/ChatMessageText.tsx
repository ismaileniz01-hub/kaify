import { splitChatInlineBold } from "@/lib/chat/inline-bold";
import { coachVisibleMessage } from "@/lib/kaios/envelope-text";

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
}: {
  text: string;
  className?: string;
  streaming?: boolean;
}) {
  const visible = coachVisibleMessage(text);
  if (!visible.trim() && !streaming) return null;
  return (
    <p className={className}>
      {visible.trim() ? parseChatInlineBold(visible) : null}
      {streaming ? <span className="chat-stream-caret" aria-hidden /> : null}
    </p>
  );
}
