-- Rename Lemon Squeezy event column to provider-neutral name for Paddle webhooks.

alter table public.billing_events
  rename column lemon_event_id to provider_event_id;

alter table public.billing_events
  rename constraint billing_events_lemon_event_unique to billing_events_provider_event_unique;

comment on column public.billing_events.provider_event_id is
  'Idempotent webhook event ID (Paddle event_id, etc.)';
