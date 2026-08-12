-- Wave 2 TEST-002: restore table privileges required for service-role seeding
-- and authenticated upserts under existing RLS policies.
--
-- Symptom (CI live suite): seed user_settings USER_A: permission denied for table user_settings
-- Cause: user_settings (and several peer tables) only had SELECT granted to authenticated,
-- and service_role lacked explicit ALL after privilege hardening migrations.
--
-- Follow-up: support_tickets / analytics_pending_confirmations had RLS policies but no
-- table GRANTs → authenticated SELECT returned "permission denied for table".

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant usage on schema public to service_role;

-- Match the existing user_settings_all_own policy (FOR ALL to authenticated).
grant select, insert, update, delete on table public.user_settings to authenticated;

-- Match support_tickets_own (FOR ALL) and analytics_pending_own (SELECT).
grant select, insert, update, delete on table public.support_tickets to authenticated;
grant select on table public.analytics_pending_confirmations to authenticated;
grant select, insert on table public.support_messages to authenticated;

-- Seed / admin paths also write these tables via service_role; keep authenticated
-- read grants and ensure service_role can insert fixtures for RLS proofs.
grant all on table public.analytics_daily to service_role;
grant all on table public.health_steps to service_role;
grant all on table public.user_market_inventory to service_role;
grant all on table public.usage_events to service_role;
grant all on table public.user_settings to service_role;
grant all on table public.support_tickets to service_role;
grant all on table public.analytics_pending_confirmations to service_role;
grant all on table public.support_messages to service_role;

notify pgrst, 'reload schema';
