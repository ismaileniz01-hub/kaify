-- 10k Faz 3: outbox retry metadata + accurate AI spend aggregates for cron/admin.

-- ---------------------------------------------------------------------------
-- domain_events: attempt tracking for poison-message handling
-- ---------------------------------------------------------------------------
alter table public.domain_events
  add column if not exists attempt_count integer not null default 0,
  add column if not exists last_error text;

comment on column public.domain_events.attempt_count is
  'Handler failure count; processor dead-letters after max attempts.';

-- ---------------------------------------------------------------------------
-- Service-role cron cost snapshot (no PostgREST row cap undercount)
-- ---------------------------------------------------------------------------
create or replace function public.service_get_ai_cost_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today_start timestamptz := date_trunc('day', now() at time zone 'utc') at time zone 'utc';
  v_since_7d timestamptz := now() - interval '7 days';
  v_today_micro bigint;
  v_today_tokens bigint;
  v_week_micro bigint;
  v_distinct_days integer;
  v_top jsonb;
begin
  if coalesce(auth.jwt()->>'role', '') <> 'service_role' then
    raise exception 'Forbidden' using errcode = 'P0001';
  end if;

  select
    coalesce(sum(estimated_usd_micro), 0),
    coalesce(sum(total_tokens), 0)
  into v_today_micro, v_today_tokens
  from public.ai_usage_ledger
  where created_at >= v_today_start;

  select
    coalesce(sum(estimated_usd_micro), 0),
    greatest(count(distinct ((created_at at time zone 'utc')::date)), 1)
  into v_week_micro, v_distinct_days
  from public.ai_usage_ledger
  where created_at >= v_since_7d;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  into v_top
  from (
    select
      l.user_id,
      coalesce(nullif(trim(p.display_name), ''), 'Unknown') as display_name,
      sum(l.total_tokens)::bigint as total_tokens,
      sum(l.estimated_usd_micro)::bigint as estimated_usd_micro
    from public.ai_usage_ledger l
    left join public.profiles p on p.id = l.user_id
    where l.created_at >= v_today_start
      and l.user_id is not null
    group by l.user_id, p.display_name
    order by sum(l.total_tokens) desc
    limit 50
  ) t;

  return jsonb_build_object(
    'today_usd_micro', v_today_micro,
    'today_tokens', v_today_tokens,
    'week_usd_micro', v_week_micro,
    'week_distinct_days', v_distinct_days,
    'top_users', v_top
  );
end;
$$;

revoke all on function public.service_get_ai_cost_snapshot() from public, anon, authenticated;
grant execute on function public.service_get_ai_cost_snapshot() to service_role;

-- ---------------------------------------------------------------------------
-- Admin cache-hit stats (SQL aggregate, no 10k-row Node scan)
-- ---------------------------------------------------------------------------
create or replace function public.admin_get_cache_hit_stats(p_days integer default 7)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_since timestamptz := now() - make_interval(days => greatest(p_days, 1));
  v_hit bigint := 0;
  v_prompt bigint := 0;
  v_calls integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Admin only' using errcode = 'P0001';
  end if;

  select
    coalesce(sum((metadata->>'prompt_cache_hit_tokens')::bigint), 0),
    coalesce(sum(prompt_tokens) filter (
      where coalesce((metadata->>'prompt_cache_hit_tokens')::bigint, 0) > 0
    ), 0),
    count(*) filter (
      where coalesce((metadata->>'prompt_cache_hit_tokens')::bigint, 0) > 0
    )
  into v_hit, v_prompt, v_calls
  from public.ai_usage_ledger
  where provider = 'deepseek'
    and created_at >= v_since
    and metadata ? 'prompt_cache_hit_tokens';

  return jsonb_build_object(
    'cache_hit_tokens', v_hit,
    'prompt_tokens', v_prompt,
    'cache_ratio_percent', case when v_prompt > 0 then round((v_hit::numeric / v_prompt) * 100) else 0 end,
    'calls_with_cache', v_calls
  );
end;
$$;

revoke all on function public.admin_get_cache_hit_stats(integer) from public, anon;
grant execute on function public.admin_get_cache_hit_stats(integer) to authenticated;
grant execute on function public.admin_get_cache_hit_stats(integer) to service_role;

-- ---------------------------------------------------------------------------
-- Outbox backlog for monitors
-- ---------------------------------------------------------------------------
create or replace function public.service_get_outbox_backlog()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pending integer;
  v_oldest timestamptz;
  v_poison integer;
begin
  if coalesce(auth.jwt()->>'role', '') <> 'service_role' then
    raise exception 'Forbidden' using errcode = 'P0001';
  end if;

  select count(*), min(occurred_at)
  into v_pending, v_oldest
  from public.domain_events
  where processed_at is null;

  select count(*)
  into v_poison
  from public.domain_events
  where processed_at is null
    and attempt_count >= 5;

  return jsonb_build_object(
    'pending', coalesce(v_pending, 0),
    'oldest_occurred_at', v_oldest,
    'poison', coalesce(v_poison, 0)
  );
end;
$$;

revoke all on function public.service_get_outbox_backlog() from public, anon, authenticated;
grant execute on function public.service_get_outbox_backlog() to service_role;

notify pgrst, 'reload schema';
