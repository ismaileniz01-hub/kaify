-- ============================================================================
-- Scalability Faz 1 — remaining RLS initplan + hot-path indexes
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. streak_gem_claims — initplan fix (added after perf migration)
-- ---------------------------------------------------------------------------
drop policy if exists "streak_gem_claims_select_own" on public.streak_gem_claims;
create policy "streak_gem_claims_select_own"
  on public.streak_gem_claims for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 2. push_notifications_consent — cron/settings filter index
-- ---------------------------------------------------------------------------
create index if not exists idx_user_settings_push_consent
  on public.user_settings (push_notifications_consent)
  where push_notifications_consent = true;

-- ---------------------------------------------------------------------------
-- 3. domain_events — processed cleanup (outbox retention)
-- ---------------------------------------------------------------------------
create index if not exists domain_events_processed_at_idx
  on public.domain_events (processed_at desc)
  where processed_at is not null;
