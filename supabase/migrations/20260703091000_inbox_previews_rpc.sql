-- ============================================================================
-- get_inbox_previews — single-query inbox previews
-- ----------------------------------------------------------------------------
-- Replaces N per-coach round-trips in messages.service.getInbox with ONE
-- query that returns the latest direct message per coach for the caller.
-- SECURITY INVOKER: runs as the calling user so RLS on chat_messages applies
-- (a user can only ever read their own messages).
-- ============================================================================

create or replace function public.get_inbox_previews(p_coach_ids text[])
returns table (
  coach_id     text,
  content      text,
  created_at   timestamptz,
  sender       public.message_sender,
  message_type public.message_type
)
language sql
stable
security invoker
set search_path = ''
as $$
  select distinct on (m.coach_id)
    m.coach_id,
    m.content,
    m.created_at,
    m.sender,
    m.message_type
  from public.chat_messages m
  where m.user_id = (select auth.uid())
    and m.thread_type = 'direct'
    and m.coach_id = any(p_coach_ids)
  order by m.coach_id, m.created_at desc;
$$;

revoke all on function public.get_inbox_previews(text[]) from public, anon;
grant execute on function public.get_inbox_previews(text[]) to authenticated;
