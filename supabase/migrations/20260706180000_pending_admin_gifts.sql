-- Admin gifts: pending until the recipient taps Claim.

create table if not exists public.pending_gifts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  reward_kind   text not null check (reward_kind in ('gems', 'freezie')),
  amount        integer not null check (amount > 0),
  reason        text not null default '',
  granted_by    uuid references public.profiles (id) on delete set null,
  claimed_at    timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists pending_gifts_user_unclaimed_idx
  on public.pending_gifts (user_id, created_at desc)
  where claimed_at is null;

alter table public.pending_gifts enable row level security;

drop policy if exists pending_gifts_select_own on public.pending_gifts;
create policy pending_gifts_select_own
  on public.pending_gifts
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke all on table public.pending_gifts from public;
grant select on table public.pending_gifts to authenticated;
grant all on table public.pending_gifts to service_role;

-- Atomically claim one pending gift and credit gems or freezies.
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
    v_earn := public.earn_gems(
      v_user_id,
      v_amount,
      'admin_adjustment'::public.gem_transaction_type,
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
