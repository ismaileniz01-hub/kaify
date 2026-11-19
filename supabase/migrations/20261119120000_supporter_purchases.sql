-- One-time "Founding Supporter" pack purchases (Paddle one-time price).
-- Kept separate from paddle_subscriptions so refunds/disputes on a supporter
-- transaction never revoke the buyer's subscription tier.

create table if not exists public.supporter_purchases (
  transaction_id text primary key,
  user_id uuid references public.profiles (id) on delete set null,
  customer_id text,
  price_id text not null,
  amount_minor bigint,
  currency_code text,
  status text not null default 'completed'
    check (status in ('completed', 'refunded', 'disputed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists supporter_purchases_user_id_idx
  on public.supporter_purchases (user_id);

alter table public.supporter_purchases enable row level security;

drop policy if exists supporter_purchases_select_own on public.supporter_purchases;
create policy supporter_purchases_select_own
  on public.supporter_purchases
  for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.supporter_purchases from anon;
revoke insert, update, delete on public.supporter_purchases from authenticated;
grant select on public.supporter_purchases to authenticated;

comment on table public.supporter_purchases is
  'Founding Supporter one-time pack purchases (Paddle). Billing record — do not delete live rows.';
