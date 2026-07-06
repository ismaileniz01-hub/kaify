# ADR 018: Tech debt register process

**Status:** Accepted · 2026-07-05  
**Context:** Sustainability Faz 4

## Decision

1. Maintain [tech-debt-register.md](../tech-debt-register.md) as the single source of deferred work
2. **Quarterly review:** engineering lead triages open items — promote, defer, or close
3. New debt items require: ID, impact statement, owner, target quarter
4. Architectural debt should reference or spawn an ADR
5. Blocked items (legal, ops) marked explicitly — not hidden in code comments

## Rationale

Undocumented debt erodes sustainability scores and onboarding velocity. A lightweight
register beats scattered TODO comments.

## Consequences

- Verification sprint F includes register review sign-off
- Promoted items enter normal sprint planning
