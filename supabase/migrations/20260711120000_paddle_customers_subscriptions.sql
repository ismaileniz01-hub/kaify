-- Mirror Paddle customer + subscription state for portal sessions and fulfillment.

create table if not exists public.paddle_customers (
  customer_id text primary key,
  user_id uuid references public.profiles (id) on delete set null,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists paddle_customers_user_id_uidx
  on public.paddle_customers (user_id)
  where user_id is not null;

create index if not exists paddle_customers_email_idx
  on public.paddle_customers (email);

create table if not exists public.paddle_subscriptions (
  subscription_id text primary key,
  customer_id text not null references public.paddle_customers (customer_id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  status text not null,
  price_id text not null,
  product_id text not null default '',
  scheduled_change_action text,
  scheduled_change_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists paddle_subscriptions_user_id_idx
  on public.paddle_subscriptions (user_id);

create index if not exists paddle_subscriptions_customer_id_idx
  on public.paddle_subscriptions (customer_id);

create index if not exists paddle_subscriptions_status_idx
  on public.paddle_subscriptions (status);

alter table public.paddle_customers enable row level security;
alter table public.paddle_subscriptions enable row level security;

drop policy if exists paddle_customers_select_own on public.paddle_customers;
create policy paddle_customers_select_own
  on public.paddle_customers
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists paddle_subscriptions_select_own on public.paddle_subscriptions;
create policy paddle_subscriptions_select_own
  on public.paddle_subscriptions
  for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.paddle_customers from anon;
revoke insert, update, delete on public.paddle_customers from authenticated;
grant select on public.paddle_customers to authenticated;

revoke all on public.paddle_subscriptions from anon;
revoke insert, update, delete on public.paddle_subscriptions from authenticated;
grant select on public.paddle_subscriptions to authenticated;

comment on table public.paddle_customers is
  'Paddle customer mirror — used for customer portal sessions. Do not delete live rows.';
comment on table public.paddle_subscriptions is
  'Paddle subscription mirror — fulfillment source of truth alongside profiles.tier.';
