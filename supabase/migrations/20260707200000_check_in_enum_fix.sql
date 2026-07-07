-- Production gem_transaction_type drift: legacy DB uses credit/debit without daily_check_in.

alter type public.gem_transaction_type add value if not exists 'daily_check_in';

drop function if exists public.perform_daily_check_in(text);
drop function if exists public.perform_daily_check_in(text, uuid);

create or replace function public.perform_daily_check_in(
  p_request_key text default null,
  p_user_id     uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id        uuid;
  v_tz             text;
  v_today          date;
  v_utc_today      date;
  v_streak         public.user_streaks;
  v_gap            integer;
  v_missed         integer;
  v_dropped        boolean := false;
  v_protected      boolean := false;
  v_already        boolean := false;
  v_new_streak     integer;
  v_longest        integer;
  v_freezie        integer;
  v_freezie_award  boolean := false;
  v_gems_awarded   integer := 0;
  v_daily_key      text;
  v_gem_col        text;
  v_gem_type_label text;
  v_has_meta       boolean;
  v_conflict_cols  text;
  v_sql            text;
  v_row_count      integer;
  v_new_level      smallint;
  v_unlocked_level smallint;
  v_level_up       boolean := false;
  v_balance        bigint;
  v_metadata       jsonb;
begin
  if coalesce(auth.jwt()->>'role', '') = 'service_role' then
    if p_user_id is null then
      raise exception 'p_user_id required for service calls' using errcode = 'P0001';
    end if;
    v_user_id := p_user_id;
  elsif auth.uid() is not null then
    v_user_id := auth.uid();
    if p_user_id is not null and p_user_id <> auth.uid() then
      raise exception 'Forbidden' using errcode = 'P0001';
    end if;
  else
    raise exception 'Authentication required' using errcode = 'P0001';
  end if;

  select coalesce(timezone, 'UTC') into v_tz
  from public.profiles where id = v_user_id;

  if v_tz is null then
    v_tz := 'UTC';
  end if;

  begin
    if not public.is_valid_timezone(v_tz) then
      v_tz := 'UTC';
    end if;
  exception when others then
    v_tz := 'UTC';
  end;

  v_today := (now() at time zone v_tz)::date;
  v_utc_today := (timezone('UTC', now()))::date;
  v_daily_key := 'daily_check_in:' || v_user_id::text || ':' || v_utc_today::text;

  select case
    when exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'gem_ledger' and column_name = 'transaction_type'
    ) then 'transaction_type'
    else 'type'
  end into v_gem_col;

  select e.enumlabel into v_gem_type_label
  from pg_enum e
  join pg_type t on e.enumtypid = t.oid
  where t.typname = 'gem_transaction_type'
    and e.enumlabel in ('daily_check_in', 'credit', 'welcome_bonus')
  order by case e.enumlabel
    when 'daily_check_in' then 1
    when 'credit' then 2
    else 3
  end
  limit 1;

  if v_gem_type_label is null then
    v_gem_type_label := 'credit';
  end if;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'gem_ledger' and column_name = 'metadata'
  ) into v_has_meta;

  select case
    when exists (
      select 1
      from pg_constraint c
      join pg_class t on c.conrelid = t.oid
      join pg_namespace n on t.relnamespace = n.oid
      where n.nspname = 'public'
        and t.relname = 'gem_ledger'
        and c.contype = 'u'
        and pg_get_constraintdef(c.oid) like '%user_id%'
        and pg_get_constraintdef(c.oid) like '%idempotency_key%'
    ) then 'user_id, idempotency_key'
    when exists (
      select 1
      from pg_constraint c
      join pg_class t on c.conrelid = t.oid
      join pg_namespace n on t.relnamespace = n.oid
      where n.nspname = 'public'
        and t.relname = 'gem_ledger'
        and c.contype = 'u'
        and pg_get_constraintdef(c.oid) like '%idempotency_key%'
    ) then 'idempotency_key'
    else null
  end into v_conflict_cols;

  insert into public.user_streaks (user_id) values (v_user_id)
    on conflict (user_id) do nothing;
  insert into public.user_kai_state (user_id) values (v_user_id)
    on conflict (user_id) do nothing;

  select * into v_streak from public.user_streaks
  where user_id = v_user_id
  for update;

  v_freezie := coalesce(v_streak.freezie_balance, 0);
  v_longest := coalesce(v_streak.longest_streak, 0);
  v_new_streak := coalesce(v_streak.current_streak, 0);

  if v_streak.last_check_in_date = v_today then
    v_already := true;
  else
    if v_streak.last_check_in_date is null then
      v_new_streak := 1;
    else
      v_gap := v_today - v_streak.last_check_in_date;
      if v_gap = 1 then
        v_new_streak := v_streak.current_streak + 1;
      elsif v_gap < 1 then
        v_already := true;
      else
        v_missed := v_gap - 1;
        if v_freezie >= v_missed then
          v_freezie := v_freezie - v_missed;
          v_protected := true;
          v_new_streak := v_streak.current_streak + 1;
        else
          v_dropped := true;
          v_new_streak := public.streak_graded_drop(v_streak.current_streak);
        end if;
      end if;
    end if;

    if not v_already then
      if not v_dropped and (v_new_streak % 7) = 0 then
        v_freezie := v_freezie + 1;
        v_freezie_award := true;
      end if;

      v_metadata := jsonb_build_object(
        'request_key', p_request_key,
        'local_date', v_today,
        'utc_date', v_utc_today,
        'tz', v_tz
      );

      if v_has_meta then
        v_sql := format(
          'insert into public.gem_ledger (user_id, amount, %I, description, idempotency_key, metadata)
           values ($1, $2, $3::public.gem_transaction_type, $4, $5, $6)',
          v_gem_col
        );
        if v_conflict_cols is not null then
          v_sql := v_sql || format(' on conflict (%s) do nothing', v_conflict_cols);
        end if;
        execute v_sql
        using v_user_id, 10, v_gem_type_label, 'Daily check-in +10', v_daily_key, v_metadata;
      else
        v_sql := format(
          'insert into public.gem_ledger (user_id, amount, %I, description, idempotency_key)
           values ($1, $2, $3::public.gem_transaction_type, $4, $5)',
          v_gem_col
        );
        if v_conflict_cols is not null then
          v_sql := v_sql || format(' on conflict (%s) do nothing', v_conflict_cols);
        end if;
        execute v_sql
        using v_user_id, 10, v_gem_type_label, 'Daily check-in +10', v_daily_key;
      end if;

      get diagnostics v_row_count = row_count;
      if v_row_count > 0 then
        v_gems_awarded := 10;
      end if;

      v_longest := greatest(v_longest, v_new_streak);

      update public.user_streaks
      set current_streak     = v_new_streak,
          longest_streak     = v_longest,
          last_check_in_date = v_today,
          freezie_balance    = v_freezie
      where user_id = v_user_id;

      v_new_level := public.kai_level_for_streak(v_new_streak);
      select unlocked_level into v_unlocked_level
      from public.user_kai_state where user_id = v_user_id;

      if v_new_level > v_unlocked_level then
        update public.user_kai_state
        set unlocked_level = v_new_level
        where user_id = v_user_id;
        v_level_up := true;
      end if;
    end if;
  end if;

  select coalesce(sum(amount), 0) into v_balance
  from public.gem_ledger where user_id = v_user_id;

  select unlocked_level into v_unlocked_level
  from public.user_kai_state where user_id = v_user_id;

  return jsonb_build_object(
    'already_checked_in', v_already,
    'current_streak',     v_new_streak,
    'longest_streak',     v_longest,
    'freezie_balance',    v_freezie,
    'freezie_awarded',    v_freezie_award,
    'streak_dropped',     v_dropped,
    'streak_protected',   v_protected,
    'gems_awarded',       v_gems_awarded,
    'gem_balance',        v_balance,
    'kai_unlocked_level', v_unlocked_level,
    'kai_level_up',       v_level_up,
    'checked_in_date',    v_today
  );
end;
$$;

revoke all on function public.perform_daily_check_in(text, uuid) from public, anon, authenticated;
grant execute on function public.perform_daily_check_in(text, uuid) to service_role;

notify pgrst, 'reload schema';

-- Country leaderboard: count check-ins by idempotency key when enum label differs.
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
  with checkins as (
    select
      p.country_code::text as country_code,
      count(*)::bigint as total_points,
      count(distinct gl.user_id)::bigint as active_users
    from public.gem_ledger gl
    join public.profiles p on p.id = gl.user_id
    where coalesce(p.leaderboard_opt_out, false) = false
      and p.country_code is not null
      and (
        gl.idempotency_key like 'daily_check_in:%'
        or (
          gl.transaction_type::text in ('daily_check_in', 'credit')
          and coalesce(gl.description, '') ilike '%check-in%'
        )
      )
    group by p.country_code
  )
  select
    rank() over (order by c.total_points desc, c.active_users desc) as rank,
    c.country_code,
    c.total_points as total_streak,
    c.active_users as user_count,
    round(
      case when c.active_users > 0 then c.total_points::numeric / c.active_users else 0 end,
      1
    ) as avg_streak
  from checkins c
  order by rank
  limit greatest(p_limit, 1);
$$;
