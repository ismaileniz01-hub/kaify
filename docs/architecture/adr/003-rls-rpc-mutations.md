# ADR 003: RLS + Service-Role RPC Mutations

**Status:** Accepted · 2026-06-30

## Context

Client-side Supabase could bypass business rules (gems, check-in, market purchase).

## Decision

- **SELECT/UPDATE own rows** via RLS for authenticated users
- **Economy mutations** only through `SECURITY DEFINER` RPCs called with service role from API
- **chat_messages INSERT** revoked from client — API-only writes

## Consequences

- (+) Atomic gem/streak/market logic in Postgres
- (+) No direct RPC from browser (revoked grants)
- (−) Every new mutation needs migration + service wrapper
