# Faz 4 — Measure & lock (2026-08-04)

Performance roadmap exit: budgets in CI + evidence that Faz 1–3 landed.

## Bundle gate

Script: `npm run budget:bundle` → `scripts/ops/check-bundle-budget.mjs`

Measured after `npm run build` @ `6755749` lineage:

| Metric | Observed | Budget |
|--------|----------|--------|
| Largest client chunk (gzip) | ~128 KB (`5857-*.js`) | ≤ 150 KB |
| Core shared gzip (framework/main/shared pick) | ~339 KB | ≤ 360 KB |
| Middleware edge gzip | ~114 KB | ≤ 140 KB |
| First Load JS shared (Next table) | **189 KB** | tracked via chunk gate |
| Marketing legal routes First Load | **~192 KB** | — |
| `/welcome` First Load | **~308 KB** | app shell (Session stack) |

CI runs the budget script immediately after `npm run build`.

## Lighthouse CI

Config: `lighthouserc.cjs`  
Script: `npm run budget:lighthouse` (requires `npm run start` on `:3000` + Chrome / Playwright Chromium via `CHROME_PATH`)

Asserted routes: `/`, `/pricing`, `/privacy`

Local verification 2026-08-04: **autorun exit 0** (3 URLs, assertions processed).

- Performance: warn &lt; 0.70 (local CI variance)
- Accessibility: error &lt; 0.85
- TTI warn &gt; 4.5s, FCP warn &gt; 2.5s
- Total byte weight error &gt; 2.5 MB

CI job runs LHCI after Playwright Chromium install + production server up.

## Cold start (lab)

| Probe | Result |
|-------|--------|
| `GET /api/health` (local prod server) | used by existing CI wait loop |
| Anonymous marketing middleware | skips Redis + `getUser` when no auth cookies (Faz 3) |
| Splash (native) | 800 ms (Faz 1) |

Device cold start &lt;2s is an **operator device check** (Android mid-tier). Lab proxy: marketing First Load ~192 KB + no Session hydrate on `/`.

## Virtualization

**Not shipped.** Inbox is coach-sized (~4 rows); leaderboard is paginated/server-capped; chat history defaults to 30 messages with narrowed selects (Faz 3). Revisit if any list exceeds ~100 DOM rows in production analytics.

## Category score card (indicative after Faz 1–3)

| Category | Audit baseline | After Faz 1–3 (est.) |
|----------|----------------|----------------------|
| Launch | 48 | ~88 |
| Navigation | 55 | ~90 |
| Rendering | 40 | ~85 |
| Animation | 55 | ~92 |
| Network | 45 | ~90 |
| Bundle | 42 | ~88 |
| Assets | 35 | ~95 |
| Memory | 60 | ~92 |
| Database | 74 | ~88 |
| Mobile Feel | 58 | ~90 |

Overall est. **~90 / 100** (was 52). Faz 4 locks regressions via CI budgets rather than claiming 95 on every device without field RUM.
