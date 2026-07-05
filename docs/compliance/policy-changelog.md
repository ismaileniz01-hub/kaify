# Policy Changelog

Last updated: 2026-07-05 · Compliance Faz 4 (A9)

Track material changes to legal documents. Bump versions in `lib/legal/constants.ts` when user re-consent may be required.

---

| Date | Document | Version | Change | Re-consent? |
|------|----------|---------|--------|-------------|
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
TERMS_VERSION = "1.0.0"
PRIVACY_VERSION = "2026-07-05"
COOKIES_VERSION = "2026-07-05"
```

When bumping `PRIVACY_VERSION` or `TERMS_VERSION`, existing users with outdated `consent_records` should be prompted via `requireTermsConsent` on sensitive routes.

---

Contact: privacy@kaifyai.org
