# API Route Inventory

All routes under `app/api/**` use the `defineRoute` family from `lib/api/route-handler.ts` unless noted.

| Route | Method | Auth | Rate limit | Notes |
|-------|--------|------|------------|-------|
| `/api/auth/callback` | GET | — | — | **Allowlist** — OAuth redirect |
| `/api/check-in` | POST | user | checkin | Idempotency-Key |
| `/api/chat/[coachId]` | GET/POST | user | chat (POST) | POST = SSE + AI guards |
| `/api/chat/[coachId]/analyze` | POST | user | analyze | Gemini + AI guards |
| `/api/chat/team` | GET/POST | user | team_meeting (POST) | |
| `/api/profile` | GET/PATCH/DELETE | user | profile_delete (DELETE) | DELETE = sensitiveAction |
| `/api/profile/export` | GET | user | profile_export | sensitiveAction |
| `/api/profile/avatar` | POST | user | avatar | |
| `/api/streak` | GET | user | — | |
| `/api/streak/rewards` | POST | user | checkin | Server milestone gems |
| `/api/gems` | GET | user | — | |
| `/api/market/*` | varies | user | chest/purchase | |
| `/api/leaderboard/*` | GET | user/none | — | Public legacy masked IDs |
| `/api/health` | GET | none | health_probe | Liveness vs cron detail |
| `/api/health/steps` | POST | user | steps | max 100k steps/entry |
| `/api/waitlist` | POST | none | waitlist | |
| `/api/subscribe` | POST | none | subscribe | |
| `/api/referral` | GET/POST | user | referral (POST) | |
| `/api/cron/*` | GET | cron secret | — | defineCronRoute |
| `/api/admin/*` | varies | admin | — | MFA AAL2 via requireAdmin |

Run `npm test -- tests/security/api-route-matrix.test.ts` to verify coverage.

## Stable v1 API

Public mobile/web contract: **`/api/v1/**`** — see [architecture/api-versioning.md](../architecture/api-versioning.md).

Legacy `/api/**` user routes return `Deprecation` + `Sunset` headers (migrate by 2027-01-01).
