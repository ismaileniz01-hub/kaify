-- Faz 3: RLS initplan fixes + missing FK indexes
-- Clears auth_rls_initplan WARN and unindexed_foreign_keys INFO for hot tables.

-- ─── FK indexes ─────────────────────────────────────────────────────────────
create index if not exists idx_analytics_pending_message_id
  on public.analytics_pending_confirmations (message_id);

create index if not exists idx_domain_events_user_id
  on public.domain_events (user_id);

create index if not exists idx_pending_gifts_granted_by
  on public.pending_gifts (granted_by);

-- ─── RLS: wrap auth.uid() in (select …) for initplan ─────────────────────────

drop policy if exists daily_chest_claims_select_own on public.daily_chest_claims;
create policy daily_chest_claims_select_own
  on public.daily_chest_claims
  for select
  using ((select auth.uid()) = user_id);

drop policy if exists streak_gem_claims_select_own on public.streak_gem_claims;
create policy streak_gem_claims_select_own
  on public.streak_gem_claims
  for select
  using (user_id = (select auth.uid()));

drop policy if exists pending_gifts_select_own on public.pending_gifts;
create policy pending_gifts_select_own
  on public.pending_gifts
  for select
  using ((select auth.uid()) = user_id);

drop policy if exists support_tickets_own on public.support_tickets;
create policy support_tickets_own
  on public.support_tickets
  for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists support_messages_own on public.support_messages;
create policy support_messages_own
  on public.support_messages
  for select
  using (
    exists (
      select 1
      from public.support_tickets t
      where t.id = support_messages.ticket_id
        and t.user_id = (select auth.uid())
    )
  );

drop policy if exists support_messages_insert_own on public.support_messages;
create policy support_messages_insert_own
  on public.support_messages
  for insert
  with check (
    sender = 'user'
    and exists (
      select 1
      from public.support_tickets t
      where t.id = support_messages.ticket_id
        and t.user_id = (select auth.uid())
    )
  );

drop policy if exists analytics_pending_own on public.analytics_pending_confirmations;
create policy analytics_pending_own
  on public.analytics_pending_confirmations
  for select
  using (user_id = (select auth.uid()));

drop policy if exists team_meeting_weeks_own on public.team_meeting_weeks;
create policy team_meeting_weeks_own
  on public.team_meeting_weeks
  for select
  using (user_id = (select auth.uid()));
