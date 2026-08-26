# ADR 019: Store billing policy (native vs web)

**Status:** Partially superseded by ADR 007 · 2026-08-26  
**Context:** Path-to-90 Faz 0 — store billing decision

## Decision

**Option B — consumption-only native app; account creation and Paddle checkout
exist only on the public website.**

1. Digital subscriptions are sold and renewed through **Paddle (Merchant of Record)** on the **website** (`/pricing`, customer portal).
2. Capacitor iOS/Android shells **must not** open in-app Paddle Checkout (WebView checkout is unreliable and conflicts with store digital-goods rules).
3. Native UI provides **sign-in only**. It may state that account creation is available at `kaifyai.org`, but it must not render a clickable signup, pricing, purchase, or external-payment link.
4. `/signup` and `/pricing` are website-only routes. A native WebView navigation to either route is replaced with `/login`.
5. After a successful website checkout, the website may show **“Open Kaify Ai app”** using the registered `kaify://login` deep link. This return link originates outside the native binary and does not initiate a purchase.
6. Native **IAP (StoreKit / Play Billing)** is out of scope until a future ADR explicitly chooses Option A (dual billing + receipt verification).
7. Region-specific external-link / alternative-billing programs are not used. They require enrollment, storefront gating, provider APIs, reporting, and applicable fees.

This is a consumption-only distribution model, not a claim that Kaify Ai is an
Apple “reader app.” Fitness coaching does not fit Apple’s reader-app definition.

## Alternatives considered

| Option | Why not now |
|--------|-------------|
| **A — Native IAP** | No StoreKit/Play Billing stack; would require dual entitlement sync with Paddle webhooks. |
| **C — External link programs** | Region-specific enrollment, storefront gating, reporting and fees; not a safe global default. |

## Consequences

- `PricingPage` / checkout resume skip `paddle.Checkout.open` when `Capacitor.isNativePlatform()`.
- Native route guard redirects `/signup` and `/pricing` to `/login`.
- Native sign-in has no clickable web signup or payment CTA.
- Website checkout completion can deep-link back to `kaify://login`.
- Store listings must link Privacy / Terms to `https://kaifyai.org/privacy` and `https://kaifyai.org/terms`.
- Play / App Store package IDs stay `org.kaifyai.app` (aligned with Capacitor `appId`).
- Revisit with Option A if App Review requires IAP or if conversion economics justify dual billing.

## Review guardrails

- Do not describe Kaify Ai as “Netflix-like” or a “reader app” in Review Notes.
- Do not show native prices, plan cards, “subscribe”, “buy”, or external checkout links.
- Explain that the installed app lets existing customers sign in and use their
  account; account creation and commerce are not features of the binary.
- Keep camera/photo wording explicit: OS picker/file capture, not hidden camera access.
- Any future external-link experiment requires a new ADR and region-aware implementation.

## Superseded native acquisition (2026-08-26)

Phase 1 ADR [007](../architecture/adr/007-local-native-client.md) updates items 3–4 and the native route guard:

- Login **and signup** UI ship in the packaged native client. Account creation uses the remote Auth API.
- Plan comparison may be local. **Paddle checkout and the customer portal remain external** (store policy).
- Website-only native routes are limited to the marketing landing (`/`).
- Coaching still stays locked until a server-authoritative paid entitlement exists.

Items 1, 2, 5, 6, and 7 are unchanged: Paddle remains Merchant of Record on the web; native IAP is still out of scope.

## References

- [store-readiness.md](../../operations/store-readiness.md)
- [DEPLOY_CHECKLIST.md](../../DEPLOY_CHECKLIST.md) § Store IAP
- `lib/billing/native-web-checkout.ts`
