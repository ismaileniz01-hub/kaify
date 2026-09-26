# F3-15 — DAST / ZAP (Phase 3)

**Date:** 2026-08-26  
**Status:** Waiver still active. No staging host was created in this phase.

Phase 3 did not invent a durable `STAGING_URL`. Weekly ZAP baseline remains
gated on `vars.STAGING_URL` as documented in
[`td008-zap-waiver.md`](./td008-zap-waiver.md). Compensating controls are
unchanged: CI lint/typecheck/tests, SBOM + OSV, CSP nonce on marketing and app
routes, and public Playwright smoke.

Do not treat this file as a passed DAST run.
