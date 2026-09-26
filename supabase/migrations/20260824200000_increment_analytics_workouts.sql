-- Atomic workout increment for library "I did this today".
-- Mirrors increment_analytics_meals: insert the daily row if missing, then +1.

create or replace function public.increment_analytics_workouts(
  p_user_id uuid,
  p_entry_date date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null or p_entry_date is null then
    raise exception 'user_id and entry_date are required' using errcode = 'P0001';
  end if;

  insert into public.analytics_daily (user_id, entry_date)
  values (p_user_id, p_entry_date)
  on conflict (user_id, entry_date) do nothing;

  update public.analytics_daily
  set
    workouts_completed = least(30, coalesce(workouts_completed, 0) + 1),
    updated_at = now()
  where user_id = p_user_id
    and entry_date = p_entry_date;
end;
$$;

revoke all on function public.increment_analytics_workouts(uuid, date)
  from public, anon, authenticated;
grant execute on function public.increment_analytics_workouts(uuid, date)
  to service_role;
