-- Leaderboard privacy opt-out + cron job heartbeat monitoring.

-- ---------------------------------------------------------------------------
-- 1. Leaderboard opt-out on profiles
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists leaderboard_opt_out boolean not null default false;

create index if not exists idx_profiles_leaderboard_opt_out
  on public.profiles (leaderboard_opt_out)
  where leaderboard_opt_out = false;

-- ---------------------------------------------------------------------------
-- 2. Cron job runs (heartbeat for scheduled jobs)
-- ---------------------------------------------------------------------------

create table if not exists public.cron_job_runs (
  job_name     text primary key,
  last_run_at  timestamptz not null default now(),
  last_status  text not null check (last_status in ('ok', 'error')),
  last_detail  jsonb,
  updated_at   timestamptz not null default now()
);

alter table public.cron_job_runs enable row level security;

revoke all on public.cron_job_runs from public, anon, authenticated;
grant select, insert, update on public.cron_job_runs to service_role;

create or replace function public.record_cron_run(
  p_job_name    text,
  p_status      text,
  p_detail      jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(trim(p_job_name), '') = '' then
    raise exception 'job_name is required' using errcode = 'P0001';
  end if;
  if p_status not in ('ok', 'error') then
    raise exception 'Invalid status' using errcode = 'P0001';
  end if;

  insert into public.cron_job_runs (job_name, last_run_at, last_status, last_detail, updated_at)
  values (p_job_name, now(), p_status, p_detail, now())
  on conflict (job_name) do update
    set last_run_at = excluded.last_run_at,
        last_status = excluded.last_status,
        last_detail = excluded.last_detail,
        updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.record_cron_run(text, text, jsonb) from public;
grant execute on function public.record_cron_run(text, text, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- 3. Leaderboard RPCs — exclude opted-out users
-- ---------------------------------------------------------------------------

create or replace function public.get_global_leaderboard(
  p_limit  integer default 50,
  p_offset integer default 0
)
returns table (
  rank           bigint,
  user_id        uuid,
  display_name   text,
  avatar_url     text,
  country_code   text,
  current_streak integer,
  longest_streak integer
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    rank() over (
      order by s.current_streak desc, s.longest_streak desc, p.created_at asc
    ) as rank,
    p.id,
    coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.full_name), ''), 'User'),
    p.avatar_url,
    p.country_code::text,
    s.current_streak,
    s.longest_streak
  from public.user_streaks s
  join public.profiles p on p.id = s.user_id
  where s.current_streak > 0
    and coalesce(p.leaderboard_opt_out, false) = false
  order by s.current_streak desc, s.longest_streak desc, p.created_at asc
  limit greatest(coalesce(p_limit, 50), 0)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function public.get_user_rank()
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_uid       uuid := auth.uid();
  v_streak    integer;
  v_rank      bigint;
  v_total     bigint;
  v_opt_out   boolean;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = 'P0001';
  end if;

  select current_streak into v_streak
  from public.user_streaks where user_id = v_uid;

  v_streak := coalesce(v_streak, 0);

  select coalesce(leaderboard_opt_out, false) into v_opt_out
  from public.profiles where id = v_uid;

  if v_opt_out or v_streak <= 0 then
    select count(*) into v_total
    from public.user_streaks s
    join public.profiles p on p.id = s.user_id
    where s.current_streak > 0
      and coalesce(p.leaderboard_opt_out, false) = false;

    return jsonb_build_object(
      'rank', null,
      'current_streak', v_streak,
      'total_ranked', v_total
    );
  end if;

  select count(*) into v_total
  from public.user_streaks s
  join public.profiles p on p.id = s.user_id
  where s.current_streak > 0
    and coalesce(p.leaderboard_opt_out, false) = false;

  select count(*) + 1 into v_rank
  from public.user_streaks s
  join public.profiles p on p.id = s.user_id
  where s.current_streak > v_streak
    and coalesce(p.leaderboard_opt_out, false) = false;

  return jsonb_build_object(
    'rank', v_rank,
    'current_streak', v_streak,
    'total_ranked', v_total
  );
end;
$$;

create or replace function public.get_country_leaderboard(
  p_limit integer default 100
)
returns table (
  rank         bigint,
  country_code text,
  total_streak bigint,
  user_count   bigint,
  avg_streak   numeric
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    rank() over (
      order by sum(s.current_streak) desc, count(*) desc
    ) as rank,
    p.country_code::text,
    sum(s.current_streak)::bigint as total_streak,
    count(*)::bigint as user_count,
    round(avg(s.current_streak), 1) as avg_streak
  from public.user_streaks s
  join public.profiles p on p.id = s.user_id
  where coalesce(p.leaderboard_opt_out, false) = false
  group by p.country_code
  order by total_streak desc, user_count desc
  limit greatest(coalesce(p_limit, 100), 0);
$$;

revoke all on function public.get_global_leaderboard(integer, integer) from public;
grant execute on function public.get_global_leaderboard(integer, integer)
  to anon, authenticated;

revoke all on function public.get_user_rank() from public;
grant execute on function public.get_user_rank() to authenticated;

revoke all on function public.get_country_leaderboard(integer) from public;
grant execute on function public.get_country_leaderboard(integer)
  to anon, authenticated;

notify pgrst, 'reload schema';
