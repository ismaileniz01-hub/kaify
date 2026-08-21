# Policy Changelog

Last updated: 2026-08-21 · Legal rewrite (engineering)

Track material changes to legal documents. Bump versions in `lib/legal/constants.ts` when user re-consent may be required.

---

| Date | Document | Version | Change | Re-consent? |
|------|----------|---------|--------|-------------|
| 2026-08-21 | Terms of Service | 2.0.0 | MoR/Paddle clarity, 16+, coaches, AI providers, delete vs cancel, provisional TR law; liability marked for counsel | Yes — existing users should re-accept when prompted |
| 2026-08-21 | Privacy Policy | 2026-08-21 | Global EN primary; health/AI/transfers; Upstash + FCM/Web Push; Paddle role split | Yes with Terms |
| 2026-08-21 | Cookie Policy | 2026-08-21 | Categories, Termly non-canonical, Sentry note, GPC intent | Cookie banner (version bump invalidates prior choice) |
| 2026-08-21 | Medical Disclaimer | 2026-08-21 | Standalone fitness/medical short form | No (linked from Terms) |
| 2026-08-21 | Compliance docs | — | LEGAL_* pack + consumer health **template**; subprocessors/tracker updates | Internal |
| 2026-07-05 | Privacy Policy | 2026-07-05 | Initial in-app readable policy, subprocessors, AI/health | New users only |
| 2026-07-05 | Terms of Service | 1.0.0 | Not medical advice, liability, age 16+ | New users only |
| 2026-07-05 | Cookie Policy | 2026-07-05 | Accept/Reject banner, analytics optional | Cookie banner |
| 2026-07-05 | KVKK Aydınlatma | 2026-07-05 | `/kvkk` page published | No |
| 2026-07-05 | ROPA | 2026-07-05 | Full ROPA replaces draft | Internal |
| 2026-07-05 | Retention policy | 2026-07-05 | Automated purge cron active | No |

---

## Version constants (code)

```typescript
// lib/legal/constants.ts
TERMS_VERSION = "2.0.0"
PRIVACY_VERSION = "2026-08-21"
COOKIES_VERSION = "2026-08-21"
MEDICAL_DISCLAIMER_VERSION = "2026-08-21"
```

When bumping `PRIVACY_VERSION` or `TERMS_VERSION`, existing users with outdated `consent_records` should be prompted via `requireTermsConsent` on sensitive routes.

See also: [LEGAL_CHANGELOG.md](./LEGAL_CHANGELOG.md) for narrative summary of the 2026-08-21 rewrite.

---

Contact: privacy@kaifyai.org
