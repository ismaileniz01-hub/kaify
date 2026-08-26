# Store readiness (Faz 5)

Last updated: 2026-08-05 · Policy: **ADR 019 (consumption-only native; web-only signup + Paddle)**

## Package IDs (single source of truth)

| Platform | ID |
|----------|-----|
| Capacitor `appId` | `org.kaifyai.app` |
| iOS bundle | `org.kaifyai.app` |
| Android `applicationId` | `org.kaifyai.app` |
| Play Store URL | `https://play.google.com/store/apps/details?id=org.kaifyai.app` |
| App Store URL | `NEXT_PUBLIC_APP_STORE_URL` or `https://apps.apple.com/app/kaify` |

Canonical package ID is **`org.kaifyai.app`** (matches Google Play Console and App Store Connect). Do **not** use `org.kaify.app`.

## Before a store build

```bash
npm run cap:sync:prod
```

Places `google-services.json` at `android/app/google-services.json` (gitignored). Template: `android/app/google-services.json.example`.

```bash
# Optional release gate
node scripts/ops/verify-google-services.mjs
npm run cap:verify-store
```

`cap:verify-store` asserts live AASA Team ID, Play App Signing SHA-256, package
`org.kaifyai.app`, privacy manifest fields, and the `kaify` URL scheme.

## Native account and billing flow

1. The installed app opens at `/login`.
2. Existing customers sign in with email OTP.
3. Native UI contains no clickable signup, pricing, purchase, or external-payment link.
4. Account creation and Paddle checkout exist only on the public website.
5. Successful website checkout offers `kaify://login` to return to the installed app.
6. Native navigations to `/signup` or `/pricing` are redirected to `/login`.

This is a consumption-only app policy. Kaify Ai is not submitted as an Apple
reader app, and no reader-app external-link entitlement is claimed.

## Permissions

| Capability | Approach |
|------------|----------|
| Microphone / speech | Declared; Capacitor speech plugin |
| Camera / photos | Info.plist usage strings; UI uses `<input type="file" capture>` (OS picker). **Permissions-Policy `camera=()`** denies `getUserMedia` — intentional; no in-page WebRTC camera. |
| Push | `POST_NOTIFICATIONS` + `PushToggle` consent + runtime request |
| HealthKit | **Not shipped** — no HealthKit entitlements/strings until a steps sync feature ships |

## Store privacy declarations

The iOS privacy manifest and App Store Connect / Play Data Safety forms must
describe the same data practices:

- account identifiers and email
- health and fitness data entered by the user
- photos/videos submitted for analysis
- device ID used for push delivery
- purchase history / subscription entitlement
- crash and performance diagnostics

Generate the Xcode archive privacy report before every submission and compare
it to the store forms.

## Deep links

| File | Purpose |
|------|---------|
| `public/.well-known/apple-app-site-association` | Universal Links — `APZ7L5F5UZ.org.kaifyai.app` |
| `public/.well-known/assetlinks.json` | Android App Links — Play **App Signing** SHA-256 for `org.kaifyai.app` |
| In-app | `/privacy`, `/terms`, `/terms&conditions` → rewrite |

Association files must use the live Team ID and Play App Signing certificate fingerprint.
Do **not** put the Play upload-key SHA-256 into production `assetlinks.json`.

## Screenshots

See [evidence/store-screenshots-checklist.md](./evidence/store-screenshots-checklist.md).

## TestFlight / Play internal

Operator evidence (install + sign-in) is recorded in [evidence/faz5-store-checklist.md](./evidence/faz5-store-checklist.md).
