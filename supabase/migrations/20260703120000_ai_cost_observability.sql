-- ============================================================================
-- AI cost observability — per-call ledger, anomaly alerts, admin aggregates
-- ============================================================================

create type public.ai_provider as enum ('deepseek', 'gemini');

create table public.ai_usage_ledger (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references public.profiles (id) on delete set null,
  provider            public.ai_provider not null,
  operation           text not null,
  prompt_tokens       integer not null default 0 check (prompt_tokens >= 0),
  completion_tokens   integer not null default 0 check (completion_tokens >= 0),
  total_tokens        integer not null default 0 check (total_tokens >= 0),
  -- Estimated cost in USD micro-dollars (1 USD = 1_000_000).
  estimated_usd_micro bigint not null default 0 check (estimated_usd_micro >= 0),
  metadata            jsonb,
  created_at          timestamptz not null default now()
);

create index idx_ai_usage_ledger_created on public.ai_usage_ledger (created_at desc);
create index idx_ai_usage_ledger_user_created on public.ai_usage_ledger (user_id, created_at desc);
create index idx_ai_usage_ledger_provider_created on public.ai_usage_ledger (provider, created_at desc);

create table public.cost_alerts (
  id          uuid primary key default gen_random_uuid(),
  alert_type  text not null,
  severity    text not null default 'warn' check (severity in ('info', 'warn', 'critical')),
  message     text not null,
  metadata    jsonb,
  acknowledged boolean not null default false,
  created_at  timestamptz not null default now()
);

create index idx_cost_alerts_created on public.cost_alerts (created_at desc);
create index idx_cost_alerts_open on public.cost_alerts (acknowledged, created_at desc);

alter table public.ai_usage_ledger enable row level security;
alter table public.cost_alerts enable row level security;

-- No client access — service_role inserts, admin reads via RPC.

-- ---------------------------------------------------------------------------
-- Admin: AI cost summary (global + by provider + by operation)
-- ---------------------------------------------------------------------------

create or replace function public.admin_get_ai_cost_summary(p_days integer default 7)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_since timestamptz := now() - make_interval(days => greatest(p_days, 1));
  v_today date := (now() at time zone 'utc')::date;
begin
  if not public.is_admin() then
    raise exception 'Admin only' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'since', v_since,
    'today', (
      select jsonb_build_object(
        'total_tokens', coalesce(sum(total_tokens), 0),
        'estimated_usd', round(coalesce(sum(estimated_usd_micro), 0)::numeric / 1000000, 4),
        'calls', count(*)
      )
      from public.ai_usage_ledger
      where (created_at at time zone 'utc')::date = v_today
    ),
    'period', (
      select jsonb_build_object(
        'total_tokens', coalesce(sum(total_tokens), 0),
        'estimated_usd', round(coalesce(sum(estimated_usd_micro), 0)::numeric / 1000000, 4),
        'calls', count(*)
      )
      from public.ai_usage_ledger
      where created_at >= v_since
    ),
    'by_provider', (
      select coalesce(jsonb_agg(row order by (row->>'estimated_usd')::numeric desc), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'provider', provider,
          'total_tokens', sum(total_tokens),
          'estimated_usd', round(sum(estimated_usd_micro)::numeric / 1000000, 4),
          'calls', count(*)
        ) as row
        from public.ai_usage_ledger
        where created_at >= v_since
        group by provider
      ) s
    ),
    'by_operation', (
      select coalesce(jsonb_agg(row order by (row->>'estimated_usd')::numeric desc), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'operation', operation,
          'total_tokens', sum(total_tokens),
          'estimated_usd', round(sum(estimated_usd_micro)::numeric / 1000000, 4),
          'calls', count(*)
        ) as row
        from public.ai_usage_ledger
        where created_at >= v_since
        group by operation
      ) s
    ),
    'daily', (
      select coalesce(jsonb_agg(row order by row->>'date'), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'date', (created_at at time zone 'utc')::date,
          'total_tokens', sum(total_tokens),
          'estimated_usd', round(sum(estimated_usd_micro)::numeric / 1000000, 4),
          'calls', count(*)
        ) as row
        from public.ai_usage_ledger
        where created_at >= v_since
        group by (created_at at time zone 'utc')::date
      ) s
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: top users by AI spend
-- ---------------------------------------------------------------------------

create or replace function public.admin_get_ai_cost_by_user(
  p_days integer default 7,
  p_limit integer default 20
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_since timestamptz := now() - make_interval(days => greatest(p_days, 1));
begin
  if not public.is_admin() then
    raise exception 'Admin only' using errcode = 'P0001';
  end if;

  return (
    select coalesce(jsonb_agg(row order by (row->>'estimated_usd')::numeric desc), '[]'::jsonb)
    from (
      select jsonb_build_object(
        'user_id', l.user_id,
        'display_name', coalesce(p.display_name, 'Unknown'),
        'tier', p.tier,
        'total_tokens', sum(l.total_tokens),
        'estimated_usd', round(sum(l.estimated_usd_micro)::numeric / 1000000, 4),
        'calls', count(*)
      ) as row
      from public.ai_usage_ledger l
      left join public.profiles p on p.id = l.user_id
      where l.created_at >= v_since and l.user_id is not null
      group by l.user_id, p.display_name, p.tier
      order by sum(l.estimated_usd_micro) desc
      limit greatest(p_limit, 1)
    ) s
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: recent quota limit events (from usage_events)
-- ---------------------------------------------------------------------------

create or replace function public.admin_get_quota_events(
  p_days integer default 7,
  p_limit integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_since timestamptz := now() - make_interval(days => greatest(p_days, 1));
begin
  if not public.is_admin() then
    raise exception 'Admin only' using errcode = 'P0001';
  end if;

  return (
    select coalesce(jsonb_agg(row order by row->>'created_at' desc), '[]'::jsonb)
    from (
      select jsonb_build_object(
        'id', e.id,
        'user_id', e.user_id,
        'display_name', coalesce(p.display_name, 'Unknown'),
        'resource', e.resource,
        'event_type', e.event_type,
        'usage_percent', e.usage_percent,
        'used', e.used,
        'limit_value', e.limit_value,
        'created_at', e.created_at
      ) as row
      from public.usage_events e
      left join public.profiles p on p.id = e.user_id
      where e.created_at >= v_since
      order by e.created_at desc
      limit greatest(p_limit, 1)
    ) s
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: operator overview (counts + today's blocks)
-- ---------------------------------------------------------------------------

create or replace function public.admin_get_overview_stats()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'utc')::date;
begin
  if not public.is_admin() then
    raise exception 'Admin only' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'users_total', (select count(*) from public.profiles),
    'users_active_today', (
      select count(distinct user_id)
      from public.chat_messages
      where (created_at at time zone 'utc')::date = v_today
    ),
    'quota_blocks_today', (
      select count(*)
      from public.usage_events
      where event_type = 'BLOCKED'
        and (created_at at time zone 'utc')::date = v_today
    ),
    'open_cost_alerts', (
      select count(*)
      from public.cost_alerts
      where acknowledged = false
    ),
    'referrals_total', (select count(*) from public.referrals)
  );
end;
$$;

revoke all on function public.admin_get_ai_cost_summary(integer) from public, anon;
grant execute on function public.admin_get_ai_cost_summary(integer) to authenticated;

revoke all on function public.admin_get_ai_cost_by_user(integer, integer) from public, anon;
grant execute on function public.admin_get_ai_cost_by_user(integer, integer) to authenticated;

revoke all on function public.admin_get_quota_events(integer, integer) from public, anon;
grant execute on function public.admin_get_quota_events(integer, integer) to authenticated;

revoke all on function public.admin_get_overview_stats() from public, anon;
grant execute on function public.admin_get_overview_stats() to authenticated;
