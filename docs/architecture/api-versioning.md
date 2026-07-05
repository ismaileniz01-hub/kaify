# API Versioning Strategy

Last updated: 2026-07-05 · **Faz 4 — implemented**

## Current state

Stable public contract: **`/api/v1/**`** (28 endpoints)

Legacy **`/api/**`** remains active with deprecation headers until **2027-01-01**.

Manifest: `lib/api/v1-manifest.ts`

## v1 endpoints

| Route | Methods |
|-------|---------|
| `/api/v1/check-in` | POST |
| `/api/v1/profile` | GET, PATCH, DELETE |
| `/api/v1/profile/export` | GET |
| `/api/v1/profile/avatar` | POST |
| `/api/v1/chat/[coachId]` | GET, POST (SSE) |
| `/api/v1/chat/[coachId]/analyze` | POST |
| `/api/v1/chat/team` | GET, POST |
| `/api/v1/streak` | GET |
| `/api/v1/streak/rewards` | POST |
| `/api/v1/gems` | GET |
| `/api/v1/market` | GET |
| `/api/v1/market/purchase` | POST, PATCH |
| `/api/v1/market/chest` | GET, POST |
| `/api/v1/analytics` | GET |
| `/api/v1/settings` | GET, PATCH |
| `/api/v1/onboarding` | POST |
| `/api/v1/usage` | GET |
| `/api/v1/kai` | GET |
| `/api/v1/home` | GET |
| `/api/v1/notifications` | GET, PATCH |
| `/api/v1/messages` | GET |
| `/api/v1/referral` | GET, POST |
| `/api/v1/health/steps` | POST |
| `/api/v1/consent` | GET, POST, DELETE |
| `/api/v1/leaderboard/global` | GET |
| `/api/v1/leaderboard/country` | GET |
| `/api/v1/push/subscribe` | POST, DELETE |
| `/api/v1/push/native` | POST, DELETE |

## Client migration

```
/api/profile  →  /api/v1/profile
/api/market   →  /api/v1/market
```

Legacy responses include:

```
Deprecation: true
Sunset: Sun, 01 Jan 2027 00:00:00 GMT
Link: </api/v1/profile>; rel="successor-version"
```

v1 responses include: `X-API-Version: v1`

## Adding a new v1 route

1. Implement handler in `app/api/<resource>/route.ts`
2. Create `app/api/v1/<resource>/route.ts` re-export
3. Add path to `API_V1_ROUTES` in `lib/api/v1-manifest.ts`
4. Update this doc

## Rules

- Breaking changes → `/api/v2` (future)
- Envelope frozen: `{ success, data, error, warning_trigger? }`
- ADR: [006-api-v1-reexports.md](./adr/006-api-v1-reexports.md)
