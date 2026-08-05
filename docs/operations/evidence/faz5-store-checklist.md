# Faz 5 — Store readiness evidence

Date: 2026-08-04 · Owner: Engineering

| Gate | Status | Evidence |
|------|--------|----------|
| Billing ADR (consumption-only B) | Done | `docs/sustainability/adr/019-store-billing-policy.md` |
| Native commerce surfaces blocked | Done | `/signup` + `/pricing` route guard; native login has no clickable purchase/signup link |
| Website → app return | Done | Paddle completion → `kaify://login` |
| Package ID alignment | Done | `org.kaify.app` everywhere; Play URL fixed in `store-links.ts` |
| PrivacyInfo.xcprivacy | Done | `ios/App/App/PrivacyInfo.xcprivacy` |
| Privacy label parity | Operator | Compare Xcode privacy report with App Store Connect + Play Data Safety |
| Camera / photo Info.plist strings | Done | `ios/App/App/Info.plist` |
| HealthKit strings | N/A | Feature not shipped |
| google-services pipeline | Done | example + verify script + gitignore |
| Notification permission UX | Done | PushToggle native copy + consent |
| `cap:sync:prod` script | Done | `npm run cap:sync:prod` |
| Privacy/terms deep links | Done | pages + `.well-known` templates |
| Permissions-Policy vs capture | Done | Documented in store-readiness.md |
| Store screenshots | Checklist | `store-screenshots-checklist.md` (assets operator) |
| TestFlight / Play internal install | Operator | Fill when builds uploaded |

## Operator follow-ups

> **2026-08-05:** Faz 5 deferred — no Apple/Google developer accounts yet.
> Engineering freeze continues under [faz6-rescore-freeze.md](./faz6-rescore-freeze.md).

- [ ] Open Apple Developer + Google Play Console accounts
- [ ] Replace `APPLE_TEAM_ID` in `apple-app-site-association`
- [ ] Replace Play signing SHA-256 in `assetlinks.json`
- [ ] Set live `NEXT_PUBLIC_APP_STORE_URL` when App Store listing exists
- [ ] Upload screenshots per checklist
- [ ] Record TestFlight + Play internal track URLs here after first install
