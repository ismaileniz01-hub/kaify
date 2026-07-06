import { splitChatInlineBold } from "@/lib/chat/inline-bold";

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
}: {
  text: string;
  className?: string;
}) {
  return <p className={className}>{parseChatInlineBold(text)}</p>;
}
