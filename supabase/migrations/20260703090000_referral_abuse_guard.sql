-- ============================================================================
-- Referral abuse guard
-- ----------------------------------------------------------------------------
-- Adds a per-referrer velocity cap to process_referral so a single account
-- cannot farm unlimited referral rewards by minting fake signups.
--
-- Behaviour when the referrer exceeds the 24h cap:
--   * the referral link is still recorded (relationship is truthful)
--   * the NEW user still receives their signup bonus (never punish the invitee)
--   * the REFERRER reward is withheld and an abuse event is logged
-- This removes the economic incentive to farm without harming legitimate users.
-- ============================================================================

create or replace function public.process_referral(
  p_referred_id uuid,
  p_code        text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code            text := upper(trim(coalesce(p_code, '')));
  v_referrer        uuid;
  v_existing        uuid;
  v_referral_id     uuid;
  v_bonus           integer := 100;
  v_recent_count    integer;
  v_referrer_cap    constant integer := 25;   -- max rewarded referrals / 24h
  v_award_referrer  boolean := true;
begin
  if p_referred_id is null or length(v_code) < 6 then
    raise exception 'invalid referral input' using errcode = 'P0001';
  end if;

  select id into v_referrer from public.profiles where referral_code = v_code;
  if v_referrer is null then
    raise exception 'Referral code not found' using errcode = 'P0002';
  end if;
  if v_referrer = p_referred_id then
    raise exception 'Cannot refer yourself' using errcode = 'P0001';
  end if;

  -- Zaten referans edilmis mi?
  select id into v_existing from public.referrals where referred_id = p_referred_id;
  if v_existing is not null then
    return jsonb_build_object(
      'applied', false, 'duplicate', true, 'referrer_id', v_referrer
    );
  end if;

  -- Velocity guard: referrer'in son 24 saatteki referans sayisi.
  select count(*) into v_recent_count
    from public.referrals
    where referrer_id = v_referrer
      and created_at > now() - interval '24 hours';

  if v_recent_count >= v_referrer_cap then
    v_award_referrer := false;
  end if;

  -- Korunan alan: referred_by_code
  perform set_config('app.guard_bypass', 'on', true);
  update public.profiles set referred_by_code = v_code where id = p_referred_id;

  insert into public.referrals (referrer_id, referred_id, code, discount_applied)
  values (v_referrer, p_referred_id, v_code, true)
  returning id into v_referral_id;

  insert into public.referral_events (referral_id, referrer_id, referred_id, event_type, metadata)
  values (
    v_referral_id, v_referrer, p_referred_id,
    case when v_award_referrer then 'signup' else 'signup_capped' end,
    jsonb_build_object('code', v_code, 'referrer_rewarded', v_award_referrer)
  );

  -- Invitee her zaman bonusunu alir (idempotent).
  insert into public.gem_ledger (user_id, amount, type, description, idempotency_key)
  values (p_referred_id, v_bonus, 'referral_bonus', 'Referral signup bonus',
          'referral_referred:' || p_referred_id::text)
  on conflict (user_id, idempotency_key) do nothing;

  -- Referrer odulu yalnizca cap asilmadiysa verilir.
  if v_award_referrer then
    insert into public.gem_ledger (user_id, amount, type, description, idempotency_key)
    values (v_referrer, v_bonus, 'referral_bonus', 'Referral reward',
            'referral_referrer:' || p_referred_id::text)
    on conflict (user_id, idempotency_key) do nothing;
  end if;

  return jsonb_build_object(
    'applied',           true,
    'duplicate',         false,
    'referrer_id',       v_referrer,
    'referral_id',       v_referral_id,
    'discount_applied',  true,
    'referrer_rewarded', v_award_referrer,
    'bonus',             v_bonus
  );
end;
$$;

revoke all on function public.process_referral(uuid, text)
  from public, anon, authenticated;
grant execute on function public.process_referral(uuid, text) to service_role;
