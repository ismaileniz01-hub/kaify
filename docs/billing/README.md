# Billing (Paddle + store policy)

Digital subscriptions use **Paddle** as Merchant of Record on the web.

| Surface | Behaviour |
|---------|-----------|
| Website `/pricing` | Paddle.js Checkout |
| Website account | Paddle customer portal (`POST /api/billing/portal`) |
| Capacitor iOS/Android | No in-app Checkout — open `https://kaifyai.org/pricing` (or portal URL) in the system browser |

Policy ADR: [019-store-billing-policy.md](../sustainability/adr/019-store-billing-policy.md)

Webhook + period helpers live under `lib/domains/billing/` and `lib/billing/`.
