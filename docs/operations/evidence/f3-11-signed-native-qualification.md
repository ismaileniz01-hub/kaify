# F3-11 — Signed native store qualification

**Date:** 2026-08-26  
**Status:** Qualification **not** complete. `npm run cap:verify-store` still fails.

## Remaining blockers (real identifiers only)

- Replace `APPLE_TEAM_ID` in `public/.well-known/apple-app-site-association`
  with the 10-character Apple Developer Team ID.
- Set `ANDROID_APP_LINK_SHA256` to the Play App Signing certificate fingerprint
  and regenerate asset links (`scripts/ops/configure-app-links.mjs`).
- Store listing screenshots and signed IPA/AAB are operator/store work, not
  inventable from this repo.

## Honest result

This phase does **not** claim a signed App Store or Play release. The packaged
Capacitor client from earlier phases remains the engineering baseline until
those identifiers exist.
