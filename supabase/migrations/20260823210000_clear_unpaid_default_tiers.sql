-- Signup must not inherit a default paid plan. Tokens and /welcome require
-- a real Paddle grant (tier_started_at or an active paddle_subscriptions row).

alter table public.profiles
  alter column tier drop default;

update public.profiles p
set tier_started_at = coalesce(p.tier_started_at, s.updated_at, s.created_at)
from public.paddle_subscriptions s
where s.user_id = p.id
  and s.status in ('active', 'trialing', 'past_due')
  and p.tier_started_at is null
  and p.tier is not null;

update public.profiles p
set tier = null
where p.tier is not null
  and p.tier_started_at is null
  and not exists (
    select 1
    from public.paddle_subscriptions s
    where s.user_id = p.id
      and s.status in ('active', 'trialing', 'past_due')
  );
