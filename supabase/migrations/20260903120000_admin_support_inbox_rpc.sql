-- Admin Hub support inbox: one indexed last-message query instead of
-- unbounded PostgREST `.in(ticket_id).order(created_at desc)` which can
-- time out / 400 and blank the whole inbox.

create or replace function public.admin_list_support_inbox(p_limit integer default 100)
returns table (
  id uuid,
  user_id uuid,
  user_name text,
  subject text,
  status text,
  updated_at timestamptz,
  last_message text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_service_role();

  return query
  select
    t.id,
    t.user_id,
    coalesce(nullif(trim(p.display_name), ''), 'User') as user_name,
    t.subject,
    t.status,
    t.updated_at,
    coalesce(m.body, t.subject) as last_message
  from public.support_tickets t
  left join public.profiles p on p.id = t.user_id
  left join lateral (
    select sm.body
    from public.support_messages sm
    where sm.ticket_id = t.id
    order by sm.created_at desc
    limit 1
  ) m on true
  where exists (
    select 1
    from public.support_messages sm2
    where sm2.ticket_id = t.id
  )
  order by t.updated_at desc
  limit greatest(least(coalesce(p_limit, 100), 200), 1);
end;
$$;

revoke all on function public.admin_list_support_inbox(integer) from public, anon, authenticated;
grant execute on function public.admin_list_support_inbox(integer) to service_role;

create index if not exists idx_support_messages_ticket_created_desc
  on public.support_messages (ticket_id, created_at desc);

notify pgrst, 'reload schema';
