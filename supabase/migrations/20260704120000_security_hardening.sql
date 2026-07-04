-- ============================================================================
-- Security hardening (2026-07-04)
--   1. Gem check-in idempotency anchored to UTC (blocks timezone farming).
--   2. profiles.timezone_updated_at — 24h cooldown enforced in API layer.
--   3. perform_daily_check_in uses transaction_type or type column (schema drift).
-- ============================================================================

alter table public.profiles
  add column if not exists timezone_updated_at timestamptz not null default now();

comment on column public.profiles.timezone_updated_at is
  'Last IANA timezone change; API enforces 24h cooldown to prevent check-in gem abuse.';

-- ---------------------------------------------------------------------------
-- Timezone-aware streak + UTC-anchored gem idempotency (max 1 gem/day/user).
-- ---------------------------------------------------------------------------
create or replace function public.perform_daily_check_in(p_request_key text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id        uuid := auth.uid();
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
  v_row_count      integer;
  v_new_level      smallint;
  v_unlocked_level smallint;
  v_level_up       boolean := false;
  v_balance        bigint;
  v_metadata       jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = 'P0001';
  end if;

  select coalesce(timezone, 'UTC') into v_tz
  from public.profiles where id = v_user_id;

  if v_tz is null or not public.is_valid_timezone(v_tz) then
    v_tz := 'UTC';
  end if;

  v_today := (now() at time zone v_tz)::date;
  v_utc_today := (timezone('UTC', now()))::date;
  -- Gem awards: one per UTC day regardless of timezone hopping.
  v_daily_key := 'daily_check_in:' || v_user_id::text || ':' || v_utc_today::text;

  select case
    when exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'gem_ledger'
        and column_name = 'transaction_type'
    ) then 'transaction_type'
    else 'type'
  end into v_gem_col;

  insert into public.user_streaks (user_id) values (v_user_id)
    on conflict (user_id) do nothing;
  insert into public.user_kai_state (user_id) values (v_user_id)
    on conflict (user_id) do nothing;

  select * into v_streak from public.user_streaks
  where user_id = v_user_id
  for update;

  v_freezie := v_streak.freezie_balance;
  v_longest := v_streak.longest_streak;

  if v_streak.last_check_in_date = v_today then
    v_already := true;
    v_new_streak := v_streak.current_streak;
  else
    if v_streak.last_check_in_date is null then
      v_new_streak := 1;
    else
      v_gap := v_today - v_streak.last_check_in_date;
      if v_gap = 1 then
        v_new_streak := v_streak.current_streak + 1;
      elsif v_gap < 1 then
        v_already := true;
        v_new_streak := v_streak.current_streak;
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

      execute format(
        'insert into public.gem_ledger (user_id, amount, %I, description, idempotency_key, metadata)
         values ($1, $2, $3::public.gem_transaction_type, $4, $5, $6)
         on conflict (user_id, idempotency_key) do nothing',
        v_gem_col
      )
      using v_user_id, 10, 'daily_check_in', 'Daily check-in +10', v_daily_key, v_metadata;

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

revoke all on function public.perform_daily_check_in(text) from public, anon;
grant execute on function public.perform_daily_check_in(text) to authenticated;

notify pgrst, 'reload schema';
