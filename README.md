# Kaify

AI fitness coach (Kai) — Next.js 15, Supabase, Vercel.

Production: **https://kaifyai.org**

## Stack

| Layer | Technology |
|-------|------------|
| Web + API | Next.js 15 (App Router) on Vercel |
| Database / Auth | Supabase (Postgres 17, RLS, OTP auth) |
| Cache / rate limit | Upstash Redis |
| AI | DeepSeek + Gemini (quota-gated, circuit breakers) |
| Mobile | Capacitor (iOS / Android) |
| Observability | Sentry, structured logging |

## Quick start

Node.js 20+ required.

```bash
npm install
cp .env.example .env.local   # fill Supabase + Upstash keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Full setup: [docs/architecture/developer-onboarding.md](docs/architecture/developer-onboarding.md)

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local dev server |
| `npm run ci` | Full quality gate (lint, typecheck, tests, build) |
| `npm run test` | Vitest unit + integration |
| `npm run load-test:k6` | k6 smoke against local or prod |

## Documentation

| Track | README |
|-------|--------|
| Enterprise scorecard | [docs/enterprise/README.md](docs/enterprise/README.md) |
| Architecture | [docs/architecture/README.md](docs/architecture/README.md) |
| Scalability | [docs/scalability/README.md](docs/scalability/README.md) |
| Reliability | [docs/reliability/README.md](docs/reliability/README.md) |
| Sustainability | [docs/sustainability/README.md](docs/sustainability/README.md) |
| Compliance | [docs/compliance/README.md](docs/compliance/README.md) |
| Security | [docs/SECURITY.md](docs/SECURITY.md) |
| Operations | [docs/RUNBOOK.md](docs/RUNBOOK.md) |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

Contact: support@kaifyai.org · Privacy: privacy@kaifyai.org
