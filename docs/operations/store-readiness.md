# Store readiness (Faz 5)

Last updated: 2026-08-04 · Policy: **ADR 019 (Option B — web-only Paddle)**

## Package IDs (single source of truth)

| Platform | ID |
|----------|-----|
| Capacitor `appId` | `org.kaify.app` |
| iOS bundle | `org.kaify.app` |
| Android `applicationId` | `org.kaify.app` |
| Play Store URL | `https://play.google.com/store/apps/details?id=org.kaify.app` |
| App Store URL | `NEXT_PUBLIC_APP_STORE_URL` or `https://apps.apple.com/app/kaify` |

Do **not** use marketing id `org.kaifyai.app` — that mismatch is closed.

## Before a store build

```bash
npm run cap:sync:prod
```

Places `google-services.json` at `android/app/google-services.json` (gitignored). Template: `android/app/google-services.json.example`.

```bash
# Optional release gate
node scripts/ops/verify-google-services.mjs
```

## Permissions

| Capability | Approach |
|------------|----------|
| Microphone / speech | Declared; Capacitor speech plugin |
| Camera / photos | Info.plist usage strings; UI uses `<input type="file" capture>` (OS picker). **Permissions-Policy `camera=()`** denies `getUserMedia` — intentional; no in-page WebRTC camera. |
| Push | `POST_NOTIFICATIONS` + `PushToggle` consent + runtime request |
| HealthKit | **Not shipped** — no HealthKit entitlements/strings until a steps sync feature ships |

## Deep links

| File | Purpose |
|------|---------|
| `public/.well-known/apple-app-site-association` | Universal Links — replace `APPLE_TEAM_ID` |
| `public/.well-known/assetlinks.json` | Android App Links — replace SHA-256 fingerprints |
| In-app | `/privacy`, `/terms`, `/terms&conditions` → rewrite |

## Screenshots

See [evidence/store-screenshots-checklist.md](./evidence/store-screenshots-checklist.md).

## TestFlight / Play internal

Operator evidence (install + sign-in) is recorded in [evidence/faz5-store-checklist.md](./evidence/faz5-store-checklist.md).
