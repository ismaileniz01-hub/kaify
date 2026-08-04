/** Columns required by ChatMessageDTO / mapChatMessageRow (excludes user_id, tokens_used, locale). */
export const CHAT_MESSAGE_LIST_COLUMNS =
  "id, coach_id, thread_type, sender, message_type, content, payload, created_at" as const;
