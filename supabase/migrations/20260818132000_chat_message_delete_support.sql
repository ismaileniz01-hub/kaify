-- Chat message deletion support:
-- - explicit reply chains so deleting a user message can remove dependent coach rows
-- - optional memory provenance for future source-aware cleanup

alter table public.chat_messages
  add column if not exists reply_to_message_id uuid references public.chat_messages (id) on delete cascade;

create index if not exists idx_chat_messages_reply_to
  on public.chat_messages (reply_to_message_id);

alter table public.coaching_memory
  add column if not exists source_message_id uuid references public.chat_messages (id) on delete cascade;

create index if not exists idx_coaching_memory_source_message
  on public.coaching_memory (source_message_id);

alter table public.analytics_pending_confirmations
  add column if not exists source_message_id uuid references public.chat_messages (id) on delete set null;

create index if not exists idx_analytics_pending_source_message
  on public.analytics_pending_confirmations (source_message_id);
