export function chatBubbleEnterClass(
  from: "user" | "coach",
  skipEnter: boolean,
): string {
  if (skipEnter) return "chat-message-bubble";
  return from === "coach"
    ? "chat-message-bubble animate-message animate-message--coach"
    : "chat-message-bubble animate-message animate-message--user";
}
