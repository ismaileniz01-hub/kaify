# ADR 008 — Product events (minimum-PII lifecycle spine)

**Status:** Accepted · 2026-08-26  
**Context:** Phase 2 event spine. Legal/privacy TTL for product analytics is **Proposed — pending approval**.

## Decision

- Additive table `public.product_events` is the lifecycle projection only.
- Writes are service-role-only. Authenticated clients cannot SELECT/INSERT.
- Payloads are allowlisted. Chat text, images, health narratives, email, IP, tokens, raw referral codes, and raw Paddle payloads are forbidden.
- Production collection stays **off** until `FEATURE_PRODUCT_EVENTS=true` is set after a versioned KVKK/GDPR decision. Staging may enable a short documented TTL (90 days) without enabling production.
- No production purge/TTL job ships in this ADR. Billing/legal evidence remains in `billing_events`.
- Canonical referral and scan correction details live in their own tables; events store hashed/internal IDs and enums only.

## Rollback

Disable `FEATURE_PRODUCT_EVENTS`. Keep the table. Do not drop rows that already exist.
