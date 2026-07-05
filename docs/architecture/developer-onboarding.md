# Developer Onboarding

Last updated: 2026-07-05 · Architecture Faz 4

Welcome to Kaify. This guide gets you from clone to first PR in under an hour.

## Prerequisites

- Node.js 20+
- npm 10+
- Supabase CLI (optional, for local DB)
- Vercel CLI (optional, for deploy)

## 1. Setup

```bash
git clone <repo-url>
cd kaify-main
npm install
cp .env.example .env.local
# Fill Supabase + AI keys in .env.local
npm run dev
```

Open http://localhost:3000

## 2. Architecture (5 min read)

| Doc | Purpose |
|-----|---------|
| [architecture/README.md](./architecture/README.md) | System overview |
| [architecture/layers.md](./architecture/layers.md) | Request flow |
| [architecture/bounded-contexts.md](./architecture/bounded-contexts.md) | Domain map |
| [SECURITY.md](../SECURITY.md) | Threat model |

**Rule:** API routes → services → Supabase. Never call RPC from the client.

## 3. API conventions

- All routes use `defineRoute` from `lib/api/route-handler.ts`
- Stable external contract: `/api/v1/**` (re-exports legacy handlers)
- Legacy `/api/**` returns `Deprecation` + `Sunset` headers — migrate clients to v1
- Response envelope: `{ success, data, error?, warning_trigger? }`

See [api-versioning.md](./architecture/api-versioning.md) and [security/api-inventory.md](../security/api-inventory.md).

## 4. Where to put code

| Change | Location |
|--------|----------|
| New API endpoint | `app/api/.../route.ts` + optional `app/api/v1/...` re-export |
| Business logic | `lib/services/*.service.ts` |
| Domain entry (new code) | `lib/domains/<context>/` |
| DB read/write split | `lib/repositories/` |
| Validation | `lib/validations/` |
| UI | `app/` + `components/` |

## 5. Database

- Migrations: `supabase/migrations/` — never edit applied migrations
- Mutations via SECURITY DEFINER RPCs (service role from API only)
- RLS on all user tables

```bash
npm run typecheck
npm test
npm run build
```

## 6. PR checklist

- [ ] `npm test` green
- [ ] `npm run typecheck` green
- [ ] New API route uses `defineRoute`
- [ ] If user-facing: add `/api/v1/` re-export + update `lib/api/v1-manifest.ts`
- [ ] Sensitive routes: rate limit + CSRF + consent as needed
- [ ] No secrets in code

## 7. Key contacts

- Engineering: support@kaifyai.org
- Privacy: privacy@kaifyai.org
- Ops: [RUNBOOK.md](../RUNBOOK.md)

## 8. Deep dives

- Compliance: [compliance/README.md](../compliance/README.md)
- ADRs: [architecture/adr/](./architecture/adr/)
- Deploy: [DEPLOY_CHECKLIST.md](../DEPLOY_CHECKLIST.md)
