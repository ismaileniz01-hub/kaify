-- Wave 5: bounded leaderboard ranking, AI daily usage aggregates, indexes.

-- ---------------------------------------------------------------------------
-- 1. Leaderboard: rank a bounded page, not rank() over every qualifying row
-- ---------------------------------------------------------------------------

create index if not exists idx_user_streaks_leaderboard_qualifying
  on public.user_streaks (current_streak desc, longest_streak desc)
  where current_streak > 0;

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
  with page as (
    select
      p.id,
      coalesce(nullif(trim(p.display_name), ''), 'User') as display_name,
      p.avatar_url,
      p.country_code::text as country_code,
      s.current_streak,
      s.longest_streak,
      p.created_at
    from public.user_streaks s
    join public.profiles p on p.id = s.user_id
    where s.current_streak > 0
      and coalesce(p.leaderboard_opt_out, false) = false
    order by s.current_streak desc, s.longest_streak desc, p.created_at asc
    limit greatest(coalesce(p_limit, 50), 0)
    offset greatest(coalesce(p_offset, 0), 0)
  )
  select
    (
      select count(*)::bigint
      from public.user_streaks s2
      join public.profiles p2 on p2.id = s2.user_id
      where s2.current_streak > 0
        and coalesce(p2.leaderboard_opt_out, false) = false
        and (
          s2.current_streak > page.current_streak
          or (
            s2.current_streak = page.current_streak
            and s2.longest_streak > page.longest_streak
          )
          or (
            s2.current_streak = page.current_streak
            and s2.longest_streak = page.longest_streak
            and p2.created_at < page.created_at
          )
        )
    ) + 1 as rank,
    page.id,
    page.display_name,
    page.avatar_url,
    page.country_code,
    page.current_streak,
    page.longest_streak
  from page;
$$;

revoke all on function public.get_global_leaderboard(integer, integer)
  from public, anon, authenticated;
grant execute on function public.get_global_leaderboard(integer, integer)
  to service_role;

create or replace function public.get_user_rank()
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_uid     uuid := auth.uid();
  v_streak  integer;
  v_longest integer;
  v_created timestamptz;
  v_rank    bigint;
  v_total   bigint;
  v_opt_out boolean;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = 'P0001';
  end if;

  select s.current_streak, s.longest_streak, p.created_at, coalesce(p.leaderboard_opt_out, false)
    into v_streak, v_longest, v_created, v_opt_out
  from public.user_streaks s
  join public.profiles p on p.id = s.user_id
  where s.user_id = v_uid;

  v_streak := coalesce(v_streak, 0);
  v_longest := coalesce(v_longest, 0);

  select count(*) into v_total
  from public.user_streaks s
  join public.profiles p on p.id = s.user_id
  where s.current_streak > 0
    and coalesce(p.leaderboard_opt_out, false) = false;

  if v_opt_out or v_streak <= 0 then
    return jsonb_build_object(
      'rank', null,
      'current_streak', v_streak,
      'total_ranked', v_total
    );
  end if;

  select count(*) + 1 into v_rank
  from public.user_streaks s
  join public.profiles p on p.id = s.user_id
  where s.current_streak > 0
    and coalesce(p.leaderboard_opt_out, false) = false
    and (
      s.current_streak > v_streak
      or (s.current_streak = v_streak and s.longest_streak > v_longest)
      or (
        s.current_streak = v_streak
        and s.longest_streak = v_longest
        and p.created_at < v_created
      )
    );

  return jsonb_build_object(
    'rank', v_rank,
    'current_streak', v_streak,
    'total_ranked', v_total
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. AI daily aggregates (ledger remains audit; hot path reads one row)
-- ---------------------------------------------------------------------------

create table if not exists public.ai_daily_usage (
  user_id              uuid not null references public.profiles (id) on delete cascade,
  usage_date           date not null,
  total_tokens         bigint not null default 0,
  estimated_usd_micro  bigint not null default 0,
  primary key (user_id, usage_date),
  constraint ai_daily_usage_tokens_nonneg check (total_tokens >= 0),
  constraint ai_daily_usage_usd_nonneg check (estimated_usd_micro >= 0)
);

create table if not exists public.ai_platform_daily_usage (
  usage_date           date primary key,
  total_tokens         bigint not null default 0,
  estimated_usd_micro  bigint not null default 0,
  constraint ai_platform_daily_usage_tokens_nonneg check (total_tokens >= 0),
  constraint ai_platform_daily_usage_usd_nonneg check (estimated_usd_micro >= 0)
);

comment on table public.ai_daily_usage is
  'UTC-day token/cost counters maintained from ai_usage_ledger inserts.';
comment on table public.ai_platform_daily_usage is
  'UTC-day platform AI spend counter; hot path for pressure/cap checks.';

alter table public.ai_daily_usage enable row level security;
alter table public.ai_platform_daily_usage enable row level security;

revoke all on table public.ai_daily_usage from public, anon, authenticated;
revoke all on table public.ai_platform_daily_usage from public, anon, authenticated;
grant all on table public.ai_daily_usage to service_role;
grant all on table public.ai_platform_daily_usage to service_role;

create or replace function public.trg_ai_usage_ledger_daily_agg()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date := (timezone('UTC', new.created_at))::date;
  v_tokens bigint := coalesce(new.total_tokens, 0);
  v_micro bigint := coalesce(new.estimated_usd_micro, 0);
begin
  if new.user_id is not null then
    insert into public.ai_daily_usage as d (user_id, usage_date, total_tokens, estimated_usd_micro)
    values (new.user_id, v_day, v_tokens, v_micro)
    on conflict (user_id, usage_date) do update
      set total_tokens = d.total_tokens + excluded.total_tokens,
          estimated_usd_micro = d.estimated_usd_micro + excluded.estimated_usd_micro;
  end if;

  insert into public.ai_platform_daily_usage as p (usage_date, total_tokens, estimated_usd_micro)
  values (v_day, v_tokens, v_micro)
  on conflict (usage_date) do update
    set total_tokens = p.total_tokens + excluded.total_tokens,
        estimated_usd_micro = p.estimated_usd_micro + excluded.estimated_usd_micro;

  return new;
end;
$$;

drop trigger if exists trg_ai_usage_ledger_daily_agg on public.ai_usage_ledger;
create trigger trg_ai_usage_ledger_daily_agg
  after insert on public.ai_usage_ledger
  for each row
  execute function public.trg_ai_usage_ledger_daily_agg();

create or replace function public.reconcile_ai_daily_usage(p_day date default ((timezone('UTC', now()))::date))
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_users int;
  v_platform_tokens bigint;
  v_platform_micro bigint;
begin
  if coalesce(auth.jwt()->>'role', '') <> 'service_role' then
    raise exception 'service_role required' using errcode = '42501';
  end if;

  delete from public.ai_daily_usage where usage_date = p_day;
  delete from public.ai_platform_daily_usage where usage_date = p_day;

  insert into public.ai_daily_usage (user_id, usage_date, total_tokens, estimated_usd_micro)
  select
    l.user_id,
    p_day,
    coalesce(sum(l.total_tokens), 0),
    coalesce(sum(l.estimated_usd_micro), 0)
  from public.ai_usage_ledger l
  where l.user_id is not null
    and (timezone('UTC', l.created_at))::date = p_day
  group by l.user_id;

  get diagnostics v_users = row_count;

  select
    coalesce(sum(l.total_tokens), 0),
    coalesce(sum(l.estimated_usd_micro), 0)
  into v_platform_tokens, v_platform_micro
  from public.ai_usage_ledger l
  where (timezone('UTC', l.created_at))::date = p_day;

  insert into public.ai_platform_daily_usage (usage_date, total_tokens, estimated_usd_micro)
  values (p_day, v_platform_tokens, v_platform_micro);

  return jsonb_build_object(
    'usage_date', p_day,
    'user_rows', v_users,
    'platform_tokens', v_platform_tokens,
    'platform_usd_micro', v_platform_micro
  );
end;
$$;

revoke all on function public.reconcile_ai_daily_usage(date) from public, anon, authenticated;
grant execute on function public.reconcile_ai_daily_usage(date) to service_role;

insert into public.ai_daily_usage (user_id, usage_date, total_tokens, estimated_usd_micro)
select
  l.user_id,
  (timezone('UTC', l.created_at))::date,
  coalesce(sum(l.total_tokens), 0),
  coalesce(sum(l.estimated_usd_micro), 0)
from public.ai_usage_ledger l
where l.user_id is not null
group by l.user_id, (timezone('UTC', l.created_at))::date
on conflict (user_id, usage_date) do update
  set total_tokens = excluded.total_tokens,
      estimated_usd_micro = excluded.estimated_usd_micro;

insert into public.ai_platform_daily_usage (usage_date, total_tokens, estimated_usd_micro)
select
  (timezone('UTC', l.created_at))::date,
  coalesce(sum(l.total_tokens), 0),
  coalesce(sum(l.estimated_usd_micro), 0)
from public.ai_usage_ledger l
group by (timezone('UTC', l.created_at))::date
on conflict (usage_date) do update
  set total_tokens = excluded.total_tokens,
      estimated_usd_micro = excluded.estimated_usd_micro;
