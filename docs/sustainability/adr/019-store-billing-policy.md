# ADR 019: Store billing policy (native vs web)

**Status:** Accepted · 2026-08-04  
**Context:** Path-to-90 Faz 5 — store readiness (mobile 90)

## Decision

**Option B — Web-only Paddle checkout; native apps deep-link to kaifyai.org.**

1. Digital subscriptions are sold and renewed through **Paddle (Merchant of Record)** on the **website** (`/pricing`, customer portal).
2. Capacitor iOS/Android shells **must not** open in-app Paddle Checkout (WebView checkout is unreliable and conflicts with store digital-goods rules).
3. Native UI shows an explicit CTA: **“Manage / subscribe on kaifyai.org”**, opened in the **system browser** via `@capacitor/app` `App.openUrl`.
4. Native **IAP (StoreKit / Play Billing)** is **out of scope** until a future ADR explicitly chooses Option A (dual billing + receipt verification).
5. Option C (external purchase links under evolving Apple/Google rules) remains a legal track only; not implemented in product code.

## Alternatives considered

| Option | Why not now |
|--------|-------------|
| **A — Native IAP** | No StoreKit/Play Billing stack; would require dual entitlement sync with Paddle webhooks. |
| **C — External link exceptions** | Needs legal review per current store guidelines; B already routes to the website. |

## Consequences

- `PricingPage` / checkout resume skip `paddle.Checkout.open` when `Capacitor.isNativePlatform()`.
- Account billing portal URLs open externally on native.
- Store listings must link Privacy / Terms to `https://kaifyai.org/privacy` and `https://kaifyai.org/terms`.
- Play / App Store package IDs stay `org.kaify.app` (aligned with Capacitor `appId`).
- Revisit if App Review requires IAP for digital subscriptions sold inside the binary.

## References

- [store-readiness.md](../../operations/store-readiness.md)
- [DEPLOY_CHECKLIST.md](../../DEPLOY_CHECKLIST.md) § Store IAP
- `lib/billing/native-web-checkout.ts`
