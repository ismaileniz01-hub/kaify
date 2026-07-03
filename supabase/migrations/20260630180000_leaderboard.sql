-- ============================================================================
-- Kaify AI — Migration 007: Leaderboard (global + country)
-- ----------------------------------------------------------------------------
-- Streak verisi (user_streaks) + profiles (country_code, display_name, avatar)
-- uzerinden sirilama. RLS profilleri "yalnizca kendi" ile kisitladigi icin
-- siralama SECURITY DEFINER RPC'leri ile yapilir ve SADECE guvenli/herkese acik
-- alanlar dondurulur (e-posta vb. asla).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Global kullanici siralamasi (streak'e gore)
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
    p.display_name,
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

-- ---------------------------------------------------------------------------
-- 2. Cagiran kullanicinin global sirasi
-- ---------------------------------------------------------------------------

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

  -- Kesin olarak daha yuksek streak'e sahip kullanici sayisi + 1.
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

-- ---------------------------------------------------------------------------
-- 3. Ulke siralamasi (toplam streak'e gore)
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

-- ---------------------------------------------------------------------------
-- 4. Yetkilendirme — listeler anon + authenticated, kullanici sirasi authenticated
-- ---------------------------------------------------------------------------

revoke all on function public.get_global_leaderboard(integer, integer) from public;
grant execute on function public.get_global_leaderboard(integer, integer)
  to anon, authenticated;

revoke all on function public.get_country_leaderboard(integer) from public;
grant execute on function public.get_country_leaderboard(integer)
  to anon, authenticated;

revoke all on function public.get_user_rank() from public, anon;
grant execute on function public.get_user_rank() to authenticated;
