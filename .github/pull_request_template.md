<!-- Keep PRs small and focused. CI (lint, typecheck, test+coverage, build) must be green. -->

## Summary

<!-- What does this change and why? Link any issue. -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor / tech debt
- [ ] Docs / ops

## Checklist

- [ ] `npm run ci` passes locally (lint, typecheck, tests + coverage, build)
- [ ] New/changed logic has unit tests
- [ ] DB changes ship as a migration in `supabase/migrations/` and were checked with the Supabase advisors
- [ ] No secrets committed; new env vars added to `.env.example`
- [ ] User-facing copy is in `lib/lang/*` (i18n), not hardcoded

## Rollout / rollback

<!-- Migrations to run, env vars to set, and how to revert if this misbehaves. -->
