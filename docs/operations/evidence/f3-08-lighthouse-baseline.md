# F3-08 — Lighthouse performance warn bar

**Date:** 2026-08-26  
**Status:** Warn threshold raised; **no 3-run production evidence yet**

## Change

`lighthouserc.cjs` performance assertion is now **warn ≥ 0.80** (was warn ≥ 0.65).
It is **not** an error-fail gate. Accessibility and SEO error floors are unchanged.

## Why this is not a GO claim

The Phase 3 plan asked for Lighthouse ≥ 0.80 with a 3-run median. This repo has
not archived three consecutive production/mobile runs at that bar. Raising the
CI warn line documents the target without blocking deploys on an unmeasured
number.

## Required before treating 0.80 as a gate

```bash
npm run lhci
# or LHCI against https://kaifyai.org on a throttled mobile profile, 3 runs
```

Archive `.lighthouseci` summaries under this folder as
`lighthouse-3run-YYYYMMDD.json`. Only then consider changing the assertion from
`warn` to `error`.
