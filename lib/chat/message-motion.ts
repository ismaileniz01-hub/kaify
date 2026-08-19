export function chatBubbleEnterClass(
  from: "user" | "coach",
  enter: boolean,
): string {
  if (!enter) return "chat-message-bubble";
  return from === "coach"
    ? "chat-message-bubble animate-message--coach"
    : "chat-message-bubble animate-message--user";
}
