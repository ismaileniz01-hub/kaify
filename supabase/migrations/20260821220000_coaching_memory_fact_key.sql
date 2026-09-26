-- Keyed coaching memory: one durable fact per user+key, refreshed for 90 days.

alter table public.coaching_memory
  add column if not exists fact_key text;

create unique index if not exists idx_coaching_memory_user_fact_key
  on public.coaching_memory (user_id, fact_key)
  where fact_key is not null;

create index if not exists idx_coaching_memory_user_fact_created
  on public.coaching_memory (user_id, created_at desc)
  where fact_key is not null;
