# Contributing to Kaify

Thank you for contributing. This guide covers the minimum bar for changes landing on `main`.

## Getting started

1. Read [docs/architecture/developer-onboarding.md](docs/architecture/developer-onboarding.md) (< 1 h setup)
2. Copy `.env.example` → `.env.local` and fill Supabase + Upstash keys
3. Run `npm install && npm run dev`

## Before opening a PR

```bash
npm run ci    # lint + typecheck + tests/coverage + build
```

All stages must pass. CI also runs k6 smoke on `/api/health` after build.

## New API route checklist

- [ ] Use `defineRoute` from `lib/api/route-handler.ts`
- [ ] Add Zod validation in `lib/validations/` when accepting body/query
- [ ] Add `/api/v1/...` re-export if the route is public (see [api-versioning.md](docs/architecture/api-versioning.md))
- [ ] Update [api-inventory.md](docs/security/api-inventory.md) if security-relevant
- [ ] Unit or integration test for non-trivial logic

## Architecture conventions

- Business logic in `lib/services/**`, not route handlers
- Prefer domain facades in `lib/domains/**` for new bounded-context code
- Mutations via Supabase RPC with `service_role` where RLS blocks client writes
- Cache keys from `lib/cache/keys.ts`; invalidate via `lib/cache/invalidate.ts`

## Tech debt

Deferred work goes in [docs/sustainability/tech-debt-register.md](docs/sustainability/tech-debt-register.md) — not drive-by TODOs.

## ADRs

Significant architectural decisions need an ADR under the relevant track:

- Architecture: `docs/architecture/adr/`
- Scalability: `docs/scalability/adr/`
- Reliability: `docs/reliability/adr/`
- Sustainability: `docs/sustainability/adr/`

## Code of conduct

Be respectful. Security issues: security@kaifyai.org (see [security.txt](https://kaifyai.org/.well-known/security.txt)).
