-- ============================================================================
-- Fixes reported by user:
--   1. Existing users created before the welcome-bonus trigger was in place
--      never received their +300 gems -> backfill the welcome_bonus ledger row.
--   2. Country leaderboard was empty because get_country_leaderboard only
--      counted users with current_streak > 0. Brand-new users (streak 0) never
--      showed their country. Relax the filter so every country with at least
--      one registered user appears, ranked by total streak then user count.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1a. Add welcome_bonus to enum (run this FIRST, then run 1b in a new query)
--     PG cannot use a new enum label in the same transaction it was added.
-- ---------------------------------------------------------------------------
alter type public.gem_transaction_type add value if not exists 'welcome_bonus';

-- ---------------------------------------------------------------------------
-- 1b. Backfill missing welcome bonus (+300) — run AFTER 1a in a NEW query
-- ---------------------------------------------------------------------------
insert into public.gem_ledger (user_id, amount, transaction_type, description, idempotency_key)
select
  p.id,
  300,
  'welcome_bonus'::public.gem_transaction_type,
  'Welcome bonus +300',
  'welcome_bonus:' || p.id::text
from public.profiles p
where not exists (
  select 1
  from public.gem_ledger g
  where g.user_id = p.id
    and g.idempotency_key = 'welcome_bonus:' || p.id::text
);

-- ---------------------------------------------------------------------------
-- 2. Country leaderboard: include all countries with registered users
-- ---------------------------------------------------------------------------
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
  group by p.country_code
  order by total_streak desc, user_count desc
  limit greatest(coalesce(p_limit, 100), 0);
$$;

revoke all on function public.get_country_leaderboard(integer) from public;
grant execute on function public.get_country_leaderboard(integer)
  to anon, authenticated;

-- Refresh PostgREST schema cache
notify pgrst, 'reload schema';
