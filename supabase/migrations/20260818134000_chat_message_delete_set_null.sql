-- Independent message delete: removing a user row must not cascade-delete
-- the coach reply. The user selects which messages to remove.
alter table public.chat_messages
  drop constraint if exists chat_messages_reply_to_message_id_fkey;

alter table public.chat_messages
  add constraint chat_messages_reply_to_message_id_fkey
  foreign key (reply_to_message_id)
  references public.chat_messages (id)
  on delete set null;
