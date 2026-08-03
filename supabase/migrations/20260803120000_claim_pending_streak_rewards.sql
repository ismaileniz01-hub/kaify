-- Batch claim all eligible streak gem rewards in one RPC round-trip.
-- Replaces N× claim_streak_gem_rewards loops from the app layer.

create or replace function public.claim_pending_streak_rewards(
  p_user_id uuid,
  p_current_streak integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_gem_col text;
  v_balance bigint;
  v_total_awarded integer := 0;
  v_claims jsonb := '[]'::jsonb;
  v_day integer;
  v_claim_key text;
  v_amount integer;
  v_description text;
  v_inserted text;
  v_milestones integer[] := array[7, 31, 61, 120];
  v_milestone integer;
begin
  if p_user_id is null then
    raise exception 'invalid claim input' using errcode = 'P0001';
  end if;
  if p_current_streak is null or p_current_streak <= 0 then
    select coalesce(sum(amount), 0) into v_balance
    from public.gem_ledger where user_id = p_user_id;
    return jsonb_build_object(
      'claims', '[]'::jsonb,
      'gem_balance', v_balance,
      'total_awarded', 0
    );
  end if;

  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'Forbidden' using errcode = 'P0001';
  end if;
  if auth.uid() is null and coalesce(auth.jwt()->>'role', '') <> 'service_role' then
    raise exception 'Authentication required' using errcode = 'P0001';
  end if;

  select case
    when exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'gem_ledger'
        and column_name = 'transaction_type'
    ) then 'transaction_type'
    else 'type'
  end into v_gem_col;

  foreach v_milestone in array v_milestones loop
    if p_current_streak >= v_milestone then
      v_claim_key := 'milestone:' || v_milestone::text;
      v_amount := 10;
      v_description := 'Streak milestone day ' || v_milestone::text;

      insert into public.streak_gem_claims (user_id, claim_key, amount)
      values (p_user_id, v_claim_key, v_amount)
      on conflict (user_id, claim_key) do nothing
      returning claim_key into v_inserted;

      if v_inserted is null then
        v_claims := v_claims || jsonb_build_array(jsonb_build_object(
          'claim_key', v_claim_key,
          'amount', v_amount,
          'claimed', false,
          'duplicate', true
        ));
      else
        execute format(
          'insert into public.gem_ledger (user_id, amount, %I, description, idempotency_key)
           values ($1, $2, $3::public.gem_transaction_type, $4, $5)
           on conflict (user_id, idempotency_key) do nothing',
          v_gem_col
        )
        using p_user_id, v_amount, 'streak_milestone', v_description,
              'streak_claim:' || p_user_id::text || ':' || v_claim_key;

        v_total_awarded := v_total_awarded + v_amount;
        v_claims := v_claims || jsonb_build_array(jsonb_build_object(
          'claim_key', v_claim_key,
          'amount', v_amount,
          'claimed', true,
          'duplicate', false
        ));
      end if;
    end if;
  end loop;

  for v_day in 1..p_current_streak loop
    v_claim_key := 'station:' || v_day::text;
    v_amount := case when v_day = 90 then 30 else 10 end;
    v_description := 'Streak station day ' || v_day::text;

    insert into public.streak_gem_claims (user_id, claim_key, amount)
    values (p_user_id, v_claim_key, v_amount)
    on conflict (user_id, claim_key) do nothing
    returning claim_key into v_inserted;

    if v_inserted is null then
      v_claims := v_claims || jsonb_build_array(jsonb_build_object(
        'claim_key', v_claim_key,
        'amount', v_amount,
        'claimed', false,
        'duplicate', true
      ));
    else
      execute format(
        'insert into public.gem_ledger (user_id, amount, %I, description, idempotency_key)
         values ($1, $2, $3::public.gem_transaction_type, $4, $5)
         on conflict (user_id, idempotency_key) do nothing',
        v_gem_col
      )
      using p_user_id, v_amount, 'streak_milestone', v_description,
            'streak_claim:' || p_user_id::text || ':' || v_claim_key;

      v_total_awarded := v_total_awarded + v_amount;
      v_claims := v_claims || jsonb_build_array(jsonb_build_object(
        'claim_key', v_claim_key,
        'amount', v_amount,
        'claimed', true,
        'duplicate', false
      ));
    end if;
  end loop;

  select coalesce(sum(amount), 0) into v_balance
  from public.gem_ledger where user_id = p_user_id;

  return jsonb_build_object(
    'claims', v_claims,
    'gem_balance', v_balance,
    'total_awarded', v_total_awarded
  );
end;
$$;

revoke all on function public.claim_pending_streak_rewards(uuid, integer) from public, anon;
grant execute on function public.claim_pending_streak_rewards(uuid, integer) to service_role;

notify pgrst, 'reload schema';
