-- ============================================================================
-- Schema bridge: align legacy production profiles with codebase expectations
-- Adds display_name, tier, country_code, avatar_url, height_cm, etc.
-- Backfills from legacy columns (full_name, subscription_tier, height, weight).
-- Also creates missing leaderboard RPCs.
-- ============================================================================

-- 1. Add columns the codebase expects (idempotent)
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists country_code char(2);
alter table public.profiles add column if not exists tier public.subscription_tier;
alter table public.profiles add column if not exists height_cm smallint;
alter table public.profiles add column if not exists weight_kg numeric(5, 2);
alter table public.profiles add column if not exists experience_level text;
alter table public.profiles add column if not exists tier_started_at timestamptz;
alter table public.profiles add column if not exists tier_expires_at timestamptz;
alter table public.profiles add column if not exists referred_by_code text;

-- 2. Backfill from legacy column names
update public.profiles
set
  display_name = coalesce(
    nullif(trim(display_name), ''),
    nullif(trim(full_name), ''),
    'User'
  ),
  tier = coalesce(tier, subscription_tier, 'essential'::public.subscription_tier),
  height_cm = coalesce(height_cm, height::smallint),
  weight_kg = coalesce(weight_kg, weight::numeric),
  experience_level = coalesce(experience_level, experience),
  country_code = coalesce(country_code, 'TR'::char(2));

-- 3. Enforce defaults / NOT NULL where safe
update public.profiles set display_name = '' where display_name is null;
alter table public.profiles alter column display_name set default '';
alter table public.profiles alter column display_name set not null;

update public.profiles set country_code = 'TR' where country_code is null;
alter table public.profiles alter column country_code set default 'TR';
alter table public.profiles alter column country_code set not null;

update public.profiles
set tier = coalesce(tier, subscription_tier, 'essential'::public.subscription_tier)
where tier is null;
alter table public.profiles alter column tier set default 'essential';
alter table public.profiles alter column tier set not null;

create index if not exists idx_profiles_country on public.profiles (country_code);
create index if not exists idx_profiles_tier on public.profiles (tier);

-- 4. Leaderboard RPCs (use coalesce for display_name safety)
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
  v_uid    uuid := auth.uid();
  v_streak integer;
  v_rank   bigint;
  v_total  bigint;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = 'P0001';
  end if;

  select current_streak into v_streak
  from public.user_streaks where user_id = v_uid;

  v_streak := coalesce(v_streak, 0);

  select count(*) into v_total
  from public.user_streaks where current_streak > 0;

  select count(*) + 1 into v_rank
  from public.user_streaks
  where current_streak > v_streak;

  return jsonb_build_object(
    'rank',           case when v_streak > 0 then v_rank else null end,
    'current_streak', v_streak,
    'total_ranked',   v_total
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
    rank() over (order by sum(s.current_streak) desc) as rank,
    p.country_code::text,
    sum(s.current_streak)::bigint as total_streak,
    count(*)::bigint as user_count,
    round(avg(s.current_streak), 1) as avg_streak
  from public.user_streaks s
  join public.profiles p on p.id = s.user_id
  where s.current_streak > 0
  group by p.country_code
  order by total_streak desc
  limit greatest(coalesce(p_limit, 100), 0);
$$;

revoke all on function public.get_global_leaderboard(integer, integer) from public;
grant execute on function public.get_global_leaderboard(integer, integer)
  to anon, authenticated;

revoke all on function public.get_country_leaderboard(integer) from public;
grant execute on function public.get_country_leaderboard(integer)
  to anon, authenticated;

revoke all on function public.get_user_rank() from public, anon;
grant execute on function public.get_user_rank() to authenticated;
