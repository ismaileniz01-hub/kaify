# ADR 007 — Locally packaged native client

Status: Accepted after Phase 1 POC  
Date: 2026-08-26

## Decision

Android and iOS store builds load `native-dist` from the application package. Production `server.url` is forbidden. The client calls versioned HTTPS APIs on `https://kaifyai.org` with a validated Supabase bearer session stored in iOS Keychain / Android Keystore-backed secure storage.

Login, signup, email verification, plan comparison, welcome, offline recovery and a Kai chat example are local UI. Account creation remains a remote Supabase Auth API operation. Coaching remains locked until the server-authoritative paid entitlement passes. Only Paddle checkout or portal may open an external browser when store policy requires it.

## POC evidence

- Conditional `output: "export"` on the main Next.js app was rejected: the same App Router tree contains dynamic server components, middleware, API route handlers and request-time auth. Exporting it would couple store packaging to unsupported or dynamic routes.
- A separate Vite entry builds the local UI without copying server code.
- Route-level component reuse measured in the POC: **0/4 existing route components** can be imported unchanged. Login/signup depend on Next navigation and contexts; welcome/chat depend on server-oriented app providers. Reusing them directly would pull Next runtime assumptions into the store bundle.
- Framework-neutral reuse measured in the POC: the native plan screen imports the canonical `PRICING_PLANS` catalog; auth uses the existing Supabase contract; API calls use the existing `/api/v1` surface.
- POC route equivalents packaged locally: **login, signup, welcome, chat (4/4)**, plus verification and plan comparison.

## Drift prevention

1. Product catalogs and entitlement rules live in framework-neutral `lib/` modules.
2. `tests/architecture/native-packaging-contract.test.ts` fails if production remote WebView mode returns, local screens disappear, bearer auth is removed, or plan data is copied instead of imported.
3. Native API changes must remain within `API_V1_ROUTES`; the bidirectional API manifest test is a release gate.
4. Shared visual tokens should be extracted from web CSS incrementally. Route components are not force-shared when their platform dependencies differ.

## Security and failure behavior

- Access/refresh sessions use `@aparajita/capacitor-secure-storage`.
- Mutating bearer requests do not use cookie CSRF; an invalid bearer never falls back to cookie auth.
- Native CORS is restricted to known Capacitor origins.
- Offline mode keeps the local interface available, blocks network actions, preserves the secure session and offers an explicit retry when connectivity returns.
- Expired or absent entitlement routes to local plan comparison; both native client and API independently deny coaching.

## Consequences

The native presentation layer is a small second entry point, not a second product backend. Some UI duplication remains, but store availability no longer depends on the website rendering. Shared catalogs, API contracts and architecture tests limit drift. New native screens require explicit parity review against their web counterpart.
