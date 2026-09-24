# ADR 019: Store billing policy (native vs web)

**Status:** Accepted (restored consumption-only) · 2026-09-24  
**Context:** Path-to-90 + store review — digital coaching unlocks

## Decision

**Consumption-only native app; account creation and Paddle checkout exist only on the public website.**

1. Digital subscriptions are sold and renewed through **Paddle (Merchant of Record)** on the **website** (`/pricing`, customer portal).
2. Capacitor iOS/Android shells **must not** open Paddle Checkout, pricing CTAs, or billing portal links.
3. Native UI is **sign-in only** for members who already subscribed on the web. No signup, plan cards, prices, “Choose a plan”, or Upgrade buttons.
4. **No unpaid product session:** if the user has no active paid entitlement, the app rejects sign-in / returns to the login shell (plain text that membership is on kaifyai.org — not a tappable checkout).
5. After a successful website checkout, the website may deep-link `kaify://login` so members return to the app. That link does not start a purchase.
6. Native **IAP (StoreKit / Play Billing)** is out of scope until a future ADR chooses dual billing.
7. Cosmetics: gem shop uses **earned gems** only. Any real-money cosmetic stays website-only.

This is a members-only companion model, not an Apple “reader app” claim.

## Alternatives considered

| Option | Why not now |
|--------|-------------|
| **A — Native IAP** | Requires StoreKit/Play Billing + dual entitlement with Paddle. |
| **B — Billing Choice / external offers** | Enrollment + Play Billing still required alongside web. |
| **C — Native signup + unpaid paywall** | Creates pricing CTAs that trigger 3.1.1 / Play Payments. Rejected. |

## Consequences

- `native-app` has no plan screen and no `Browser.open` checkout.
- `/api/v1/billing/native-checkout` returns FORBIDDEN.
- Native My Account / Usage show text only for billing; no `openExternalUrl` to pricing/portal.
- Store listings: no IAP; members sign in after website subscribe.
- Revisit Option A if App Review requires IAP or conversion economics change.

## References

- [store-readiness.md](../../operations/store-readiness.md)
- `lib/billing/native-web-checkout.ts`
- `lib/auth/post-auth-redirect.ts`
