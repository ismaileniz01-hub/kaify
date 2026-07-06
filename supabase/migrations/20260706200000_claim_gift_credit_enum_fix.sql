-- claim_pending_gift: never cast invalid enum labels in CASE branches (PG validates casts).

create or replace function public.claim_pending_gift(p_gift_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id       uuid;
  v_kind          text;
  v_amount        integer;
  v_reason        text;
  v_granted_by    uuid;
  v_earn          jsonb;
  v_freezie       integer;
  v_gem_balance   bigint;
  v_gem_label     text;
begin
  if p_gift_id is null then
    raise exception 'gift_id is required' using errcode = 'P0001';
  end if;

  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = 'P0001';
  end if;

  update public.pending_gifts
  set claimed_at = now()
  where id = p_gift_id
    and user_id = v_user_id
    and claimed_at is null
  returning reward_kind, amount, reason, granted_by
  into v_kind, v_amount, v_reason, v_granted_by;

  if not found then
    raise exception 'Gift not found or already claimed' using errcode = 'P0001';
  end if;

  if v_kind = 'gems' then
    select e.enumlabel into v_gem_label
    from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    where t.typname = 'gem_transaction_type'
      and e.enumlabel in ('credit', 'welcome_bonus', 'daily_chest')
    order by case e.enumlabel
      when 'credit' then 1
      when 'welcome_bonus' then 2
      else 3
    end
    limit 1;

    if v_gem_label is null then
      raise exception 'No compatible gem transaction type' using errcode = 'P0001';
    end if;

    v_earn := public.earn_gems(
      v_user_id,
      v_amount,
      v_gem_label::public.gem_transaction_type,
      coalesce(nullif(trim(v_reason), ''), 'Admin hediyesi'),
      'pending_gift:' || p_gift_id::text,
      jsonb_build_object('gift_id', p_gift_id, 'granted_by', v_granted_by)
    );
    return jsonb_build_object(
      'giftId', p_gift_id,
      'rewardKind', v_kind,
      'amount', v_amount,
      'gemBalance', (v_earn->>'balance')::bigint,
      'freezieBalance', null
    );
  end if;

  v_freezie := public.grant_freezie(v_user_id, v_amount);

  select coalesce(sum(amount), 0) into v_gem_balance
  from public.gem_ledger where user_id = v_user_id;

  return jsonb_build_object(
    'giftId', p_gift_id,
    'rewardKind', v_kind,
    'amount', v_amount,
    'gemBalance', v_gem_balance,
    'freezieBalance', v_freezie
  );
end;
$$;

revoke all on function public.claim_pending_gift(uuid) from public;
grant execute on function public.claim_pending_gift(uuid) to authenticated;

notify pgrst, 'reload schema';
