# ADR 004: Market Catalog — Database Single Source

**Status:** Accepted · 2026-07-01

## Context

Early UI hardcoded aura prices; risk of UI/API price drift.

## Decision

- `market_items` table is the **only** catalog source
- `purchase_market_item` RPC reads price from DB at transaction time
- API caches catalog 300s via `CacheKeys.marketItems()`

## Consequences

- (+) Price changes without deploy
- (+) Idempotent purchases via gem ledger
- (−) Cache invalidation needed on admin catalog edits
