-- ============================================================================
-- Phase 1: Database performance hardening for scale (~10k users)
--   1.1  Wrap auth.<fn>() in (select ...) so RLS evaluates it once per query
--        instead of once per row (auth_rls_initplan).
--   1.2  Add covering indexes for unindexed foreign keys.
--   1.3  Consolidate multiple permissive policies (own + admin) into one.
-- Logic is preserved exactly; only evaluation strategy changes.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1  Single-owner policies: re-create with (select auth.uid())
-- ----------------------------------------------------------------------------

drop policy if exists "analytics_daily_select_own" on public.analytics_daily;
create policy "analytics_daily_select_own" on public.analytics_daily
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "chat_messages_select_own" on public.chat_messages;
create policy "chat_messages_select_own" on public.chat_messages
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "chat_messages_insert_own_user" on public.chat_messages;
create policy "chat_messages_insert_own_user" on public.chat_messages
  for insert to authenticated
  with check (
    ((select auth.uid()) = user_id)
    and (sender = 'user'::message_sender)
    and (thread_type = 'direct'::text)
  );

drop policy if exists "coaching_memory_select_own" on public.coaching_memory;
create policy "coaching_memory_select_own" on public.coaching_memory
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Kullanıcılar kendi elmas geçmişlerini görebilir" on public.gem_ledger;
create policy "gem_ledger_select_own" on public.gem_ledger
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "health_steps_select_own" on public.health_steps;
create policy "health_steps_select_own" on public.health_steps
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "native_push_tokens_select_own" on public.native_push_tokens;
create policy "native_push_tokens_select_own" on public.native_push_tokens
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "usage_events_select_own" on public.usage_events;
create policy "usage_events_select_own" on public.usage_events
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "user_coaching_state_select_own" on public.user_coaching_state;
create policy "user_coaching_state_select_own" on public.user_coaching_state
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "user_kai_state_select_own" on public.user_kai_state;
create policy "user_kai_state_select_own" on public.user_kai_state
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "user_market_inventory_select_own" on public.user_market_inventory;
create policy "user_market_inventory_select_own" on public.user_market_inventory
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "user_streaks_select_own" on public.user_streaks;
create policy "user_streaks_select_own" on public.user_streaks
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "user_usage_counters_select_own" on public.user_usage_counters;
create policy "user_usage_counters_select_own" on public.user_usage_counters
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "admin_audit_select_admin" on public.admin_audit_log;
create policy "admin_audit_select_admin" on public.admin_audit_log
  for select to authenticated
  using ((select public.is_admin()));

-- ----------------------------------------------------------------------------
-- 1.3  Consolidate multiple permissive policies (own + admin) into one
-- ----------------------------------------------------------------------------

-- profiles SELECT: own OR admin
drop policy if exists "Kullanıcılar kendi profillerini görebilir" on public.profiles;
drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select to authenticated
  using (((select auth.uid()) = id) or (select public.is_admin()));

-- profiles UPDATE: own only (re-create optimized)
drop policy if exists "Kullanıcılar kendi profillerini güncelleyebilir" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- referrals SELECT: own OR admin
drop policy if exists "referrals_select_admin" on public.referrals;
drop policy if exists "referrals_select_own" on public.referrals;
create policy "referrals_select_own_or_admin" on public.referrals
  for select to authenticated
  using (
    ((select auth.uid()) = referrer_id)
    or ((select auth.uid()) = referred_id)
    or (select public.is_admin())
  );

-- referral_events SELECT: own OR admin
drop policy if exists "referral_events_select_admin" on public.referral_events;
drop policy if exists "referral_events_select_own" on public.referral_events;
create policy "referral_events_select_own_or_admin" on public.referral_events
  for select to authenticated
  using (
    ((select auth.uid()) = referrer_id)
    or ((select auth.uid()) = referred_id)
    or (select public.is_admin())
  );

-- user_settings: the ALL policy already covers SELECT; drop the redundant
-- SELECT-only policy and re-create the ALL policy optimized.
drop policy if exists "user_settings_select_own" on public.user_settings;
drop policy if exists "user_settings_upsert_own" on public.user_settings;
create policy "user_settings_all_own" on public.user_settings
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ----------------------------------------------------------------------------
-- 1.2  Covering indexes for unindexed foreign keys
-- ----------------------------------------------------------------------------

create index if not exists idx_chat_messages_coach_id
  on public.chat_messages (coach_id);

create index if not exists idx_coaching_memory_coach_id
  on public.coaching_memory (coach_id);

create index if not exists idx_gem_ledger_user_id
  on public.gem_ledger (user_id);

create index if not exists idx_referral_events_referral_id
  on public.referral_events (referral_id);

create index if not exists idx_referral_events_referred_id
  on public.referral_events (referred_id);

create index if not exists idx_user_market_inventory_item_id
  on public.user_market_inventory (item_id);
