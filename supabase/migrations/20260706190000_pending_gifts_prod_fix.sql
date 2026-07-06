-- Fix production drift: claim uses credit when admin_adjustment missing;
-- admin gift creation via RPC (reliable after schema changes).

create or replace function public.admin_create_pending_gift(
  p_user_id     uuid,
  p_reward_kind text,
  p_amount      integer,
  p_reason      text,
  p_granted_by  uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.pending_gifts%rowtype;
begin
  if p_user_id is null then
    raise exception 'user_id is required' using errcode = 'P0001';
  end if;
  if p_reward_kind not in ('gems', 'freezie') then
    raise exception 'Invalid reward kind' using errcode = 'P0001';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'User not found' using errcode = 'P0001';
  end if;

  insert into public.pending_gifts (user_id, reward_kind, amount, reason, granted_by)
  values (
    p_user_id,
    p_reward_kind,
    p_amount,
    coalesce(nullif(trim(p_reason), ''), 'Admin hediyesi'),
    p_granted_by
  )
  returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id,
    'rewardKind', v_row.reward_kind,
    'amount', v_row.amount,
    'reason', v_row.reason,
    'createdAt', v_row.created_at
  );
end;
$$;

revoke all on function public.admin_create_pending_gift(uuid, text, integer, text, uuid) from public;
grant execute on function public.admin_create_pending_gift(uuid, text, integer, text, uuid) to service_role;

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
  v_gem_type      public.gem_transaction_type;
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
    select case
      when exists (
        select 1 from pg_enum e
        join pg_type t on e.enumtypid = t.oid
        where t.typname = 'gem_transaction_type' and e.enumlabel = 'admin_adjustment'
      ) then 'admin_adjustment'::public.gem_transaction_type
      when exists (
        select 1 from pg_enum e
        join pg_type t on e.enumtypid = t.oid
        where t.typname = 'gem_transaction_type' and e.enumlabel = 'credit'
      ) then 'credit'::public.gem_transaction_type
      else 'welcome_bonus'::public.gem_transaction_type
    end into v_gem_type;

    v_earn := public.earn_gems(
      v_user_id,
      v_amount,
      v_gem_type,
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
