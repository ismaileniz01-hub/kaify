# Data Retention Policy (Compliance Faz 2–3)

Last updated: 2026-07-05 · Version 2026-07-05

## Purpose

This document defines how long Kaify retains personal data. **Automated enforcement:** weekly cron `/api/cron/retention-purge` (Sundays 02:00 UTC).

## Retention schedule

| Data category | Table(s) | Retention | Legal basis |
|---------------|----------|-----------|-------------|
| Account & profile | `profiles`, `user_settings` | Until account deletion | Contract |
| Auth identity | Supabase Auth | Until account deletion | Contract |
| AI chat | `chat_messages`, `coaching_memory` | **24 months** after last activity | Consent / contract |
| Health metrics | `health_steps`, `analytics_daily` | **36 months** | Consent |
| AI usage ledger | `ai_usage_ledger` | **24 months** (or deleted with account) | Legitimate interest |
| Gems & economy | `gem_ledger`, `user_market_inventory` | Until account deletion | Contract |
| Notifications | `notifications` | **12 months** | Contract |
| Push tokens | `push_subscriptions`, `native_push_tokens` | Until removed or account deletion | Consent |
| Consent evidence | `consent_records`, `consent_revocations` | **6 years** after last event | Legal obligation |
| Export audit | `data_export_logs` | **24 months** | Legitimate interest |
| Billing webhooks | `billing_events` | **7 years** (tax/accounting) | Legal obligation |
| Idempotency keys | `idempotency_keys` | **90 days** | Technical necessity |
| Admin audit | `admin_audit_log` | **24 months** (admin_id anonymized on user delete) | Legitimate interest |
| Server logs | Vercel / Supabase | Per vendor policy (~30–90 days) | Legitimate interest |
| Error monitoring | Sentry | **90 days** (PII scrubbed) | Legitimate interest |

## Account deletion

When a user deletes their account:

- Auth user is removed → `profiles` CASCADE deletes all child tables
- `ai_usage_ledger` rows are **CASCADE deleted** (Faz 2 migration)
- Avatar files in Supabase Storage are explicitly removed
- `billing_events.user_id` is SET NULL (financial audit retained without user link)
- `admin_audit_log.admin_id` is SET NULL (admin actions by deleted user anonymized)

## Payment data split

- **Card data:** never stored by Kaify — Paddle (Merchant of Record)
- **Kaify stores:** subscription tier, webhook metadata, billing email from webhooks

Contact: privacy@kaifyai.org
