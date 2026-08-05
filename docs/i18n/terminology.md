# i18n terminology lock (EN ↔ TR)

Canonical product terms. Do not invent synonyms in UI copy.

| Concept | EN | TR (allowed) | TR (banned) |
|---|---|---|---|
| Shop / store surface | Market | Market | Pazar, Mağaza (nav titles) |
| Daily streak action | Check-in | Seri kontrolü / kontrol et | Giriş, Giriş yap |
| Auth sign-in | Log in / Sign in | Giriş yap | (ok for auth only) |
| Retry action | Retry | Tekrar dene | Retry (TR UI) |
| Continue action | Continue | Devam et | Continue (TR UI) |

## Enforcement

- `tests/compliance/i18n-quality.test.ts` asserts Market labels and check-in ≠ Giriş.
- New TR strings that collide with auth "Giriş" for check-in keys fail CI.
- Prefer `t()` keys over hardcoded UI; prefer `lib/i18n/format.ts` for numbers/dates.
