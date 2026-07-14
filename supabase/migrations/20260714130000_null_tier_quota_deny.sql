-- Null/ unpaid tier: deny quota cleanly instead of raising 'Tier limits not configured'.
-- Also harden get_usage_status so settings UI does not 500 after cancel.

create or replace function public.check_and_increment_usage(
  p_user_id  uuid,
  p_resource public.usage_resource,
  p_amount   integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today       date := (now() at time zone 'utc')::date;
  v_month_start date := date_trunc('month', (now() at time zone 'utc'))::date;
  v_week_start  date := date_trunc('week',  (now() at time zone 'utc'))::date;
  v_tier        public.subscription_tier;
  v_limit       bigint;
  v_used        bigint;
  v_new_used    bigint;
  v_counters    public.user_usage_counters;
  v_allowed     boolean;
  v_warning     text := null;
  v_percent     numeric(6, 2);
  v_remaining   bigint;
begin
  if p_user_id is null then
    raise exception 'user_id is required' using errcode = 'P0001';
  end if;
  if p_amount is null or p_amount < 0 then
    raise exception 'amount must be >= 0' using errcode = 'P0001';
  end if;

  select tier into v_tier from public.profiles where id = p_user_id;
  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  -- No paid plan yet (or revoked): block AI usage without hard error.
  if v_tier is null then
    return jsonb_build_object(
      'allowed',         false,
      'warning_trigger', 'LIMIT_100',
      'resource',        p_resource,
      'tier',            null,
      'used',            0,
      'limit',           0,
      'remaining',       0,
      'percent',         100
    );
  end if;

  select case p_resource
    when 'text_tokens' then tl.monthly_text_tokens
    when 'maya_photo'  then tl.maya_photos_daily::bigint
    when 'leo_photo'   then tl.leo_photos_weekly::bigint
  end
  into v_limit
  from public.tier_limits tl
  where tl.tier = v_tier;

  if v_limit is null then
    raise exception 'Tier limits not configured' using errcode = 'P0001';
  end if;

  insert into public.user_usage_counters (user_id) values (p_user_id)
    on conflict (user_id) do nothing;

  select * into v_counters from public.user_usage_counters
  where user_id = p_user_id
  for update;

  if p_resource = 'text_tokens' then
    v_used := case when v_counters.text_period_start = v_month_start
                then v_counters.text_tokens_used else 0 end;
  elsif p_resource = 'maya_photo' then
    v_used := case when v_counters.maya_period_date = v_today
                then v_counters.maya_photos_used else 0 end;
  else
    v_used := case when v_counters.leo_week_start = v_week_start
                then v_counters.leo_photos_used else 0 end;
  end if;

  if v_used >= v_limit or (p_amount > 0 and v_used + p_amount > v_limit) then
    v_allowed  := false;
    v_warning  := 'LIMIT_100';
    v_new_used := v_used;
  else
    v_allowed  := true;
    v_new_used := v_used + p_amount;

    if p_amount > 0 then
      if p_resource = 'text_tokens' then
        update public.user_usage_counters
          set text_tokens_used = v_new_used, text_period_start = v_month_start
          where user_id = p_user_id;
      elsif p_resource = 'maya_photo' then
        update public.user_usage_counters
          set maya_photos_used = v_new_used, maya_period_date = v_today
          where user_id = p_user_id;
      else
        update public.user_usage_counters
          set leo_photos_used = v_new_used, leo_week_start = v_week_start
          where user_id = p_user_id;
      end if;
    end if;
  end if;

  v_remaining := greatest(v_limit - v_new_used, 0);
  v_percent := case when v_limit > 0
                 then round((v_new_used::numeric / v_limit::numeric) * 100, 2)
                 else 100 end;

  if v_allowed then
    if v_new_used >= v_limit then
      v_warning := 'LIMIT_100';
    elsif v_percent >= 80 then
      v_warning := 'LIMIT_80';
    end if;
  end if;

  if v_warning is not null or not v_allowed then
    insert into public.usage_events (user_id, resource, event_type, usage_percent, used, limit_value, metadata)
    values (
      p_user_id, p_resource,
      case when not v_allowed then 'BLOCKED' else v_warning end,
      v_percent, v_new_used, v_limit,
      jsonb_build_object('amount', p_amount)
    );
  end if;

  return jsonb_build_object(
    'allowed',         v_allowed,
    'warning_trigger', v_warning,
    'resource',        p_resource,
    'tier',            v_tier,
    'used',            v_new_used,
    'limit',           v_limit,
    'remaining',       v_remaining,
    'percent',         v_percent
  );
end;
$$;

create or replace function public.get_usage_status()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id     uuid := auth.uid();
  v_today       date := (now() at time zone 'utc')::date;
  v_month_start date := date_trunc('month', (now() at time zone 'utc'))::date;
  v_week_start  date := date_trunc('week',  (now() at time zone 'utc'))::date;
  v_tier        public.subscription_tier;
  v_c           public.user_usage_counters;
  v_text_limit  bigint;
  v_maya_limit  bigint;
  v_leo_limit   bigint;
  v_text_used   bigint;
  v_maya_used   bigint;
  v_leo_used    bigint;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = 'P0001';
  end if;

  select tier into v_tier from public.profiles where id = v_user_id;
  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  if v_tier is null then
    return jsonb_build_object(
      'tier',        null,
      'text_tokens', public.build_usage_node(0, 0),
      'maya_photo',  public.build_usage_node(0, 0),
      'leo_photo',   public.build_usage_node(0, 0)
    );
  end if;

  select monthly_text_tokens, maya_photos_daily::bigint, leo_photos_weekly::bigint
  into v_text_limit, v_maya_limit, v_leo_limit
  from public.tier_limits where tier = v_tier;

  insert into public.user_usage_counters (user_id) values (v_user_id)
    on conflict (user_id) do nothing;

  select * into v_c from public.user_usage_counters where user_id = v_user_id;

  v_text_used := case when v_c.text_period_start = v_month_start then v_c.text_tokens_used else 0 end;
  v_maya_used := case when v_c.maya_period_date = v_today then v_c.maya_photos_used else 0 end;
  v_leo_used  := case when v_c.leo_week_start = v_week_start then v_c.leo_photos_used else 0 end;

  return jsonb_build_object(
    'tier',        v_tier,
    'text_tokens', public.build_usage_node(v_text_used, coalesce(v_text_limit, 0)),
    'maya_photo',  public.build_usage_node(v_maya_used, coalesce(v_maya_limit, 0)),
    'leo_photo',   public.build_usage_node(v_leo_used, coalesce(v_leo_limit, 0))
  );
end;
$$;
