# Event / Outbox Pattern

Last updated: 2026-07-05

## Phase 1 (current)

Critical operations emit structured domain events via `emitDomainEvent()` → application logs (Sentry/Vercel searchable).

Events: `account.deleted`, `account.exported`, `market.purchased`, `billing.webhook.received`, `consent.*`

```typescript
import { createDomainEvent } from "@/lib/events/types";
import { emitDomainEvent } from "@/lib/events/emit";

emitDomainEvent(createDomainEvent("account.deleted", userId, {}, userId));
```

## Phase 2 (current — Architecture Faz 3)

`emitDomainEvent()` inserts into `domain_events` (fail-open) and logs.

Hourly worker: `GET /api/cron/outbox` → marks events processed.

```typescript
import { createDomainEvent } from "@/lib/events/types";
import { emitDomainEvent } from "@/lib/events/emit";

emitDomainEvent(createDomainEvent("account.deleted", userId, {}, userId));
```

## Event types

| Operation | Event |
|-----------|-------|
| Account delete | `account.deleted` |
| Data export | `account.exported` |
| Daily check-in | `check_in.completed` |
| Market purchase | `market.purchased` |
| LS webhook | `billing.webhook.received` |
| Consent API | `consent.granted` / `consent.revoked` |

## Phase 3 (future)

Async side effects (email, analytics pipeline) via dedicated handlers per event type.
