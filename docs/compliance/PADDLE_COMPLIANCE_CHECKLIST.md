# Paddle Compliance Checklist — Merchant of Record

**Last updated:** 2026-08-21  
**Product:** Kaify Ai · Payments via **Paddle Billing (MoR)**  
**Not legal advice.** Aligns Terms v2.0.0 / Privacy 2026-08-21 / `subscription-disclosures.ts`.

Official links (verify periodically):

- Buyer Terms: https://www.paddle.com/legal/buyer-terms  
- Refund Policy: https://www.paddle.com/legal/refund-policy  
- Privacy Notice: https://www.paddle.com/legal/privacy  

---

## 1. MoR separation (Kaify vs Paddle)

| Check | Status | Evidence / action |
|-------|--------|-------------------|
| Two relationships stated: Kaify = product; Paddle = payment MoR / reseller | Done (copy) | Terms §12; Privacy §1; checkout disclosures |
| Paddle not described as fitness/AI provider | Done | Terms §1, §12 |
| Kaify does not claim to store full card numbers | Done | Terms §12; retention-policy |
| Privacy roles: Paddle typically independent controller for transaction data; Kaify for entitlements | Done (copy) | Privacy §1 |
| Seller entity / which Paddle group company named precisely | TODO | LEGAL_FACTS_REQUIRED F20 |

---

## 2. Buyer Terms / Refund / Privacy links in UX

| Surface | Status | Notes |
|---------|--------|-------|
| Full Terms document | Done | Links in Terms §12 |
| Short checkout / pricing disclosures | Done | `SUBSCRIPTION_DISCLOSURES` EN/TR |
| In-app Settings → Manage billing messaging | Partial | Copy exists; verify UI always shows Paddle links |
| Marketing pricing page near CTA | TODO verify | Must not contradict MoR / auto-renew |

---

## 3. Portal cancel (Manage billing)

| Check | Status | Notes |
|-------|--------|-------|
| Cancel via Paddle Customer Portal | Done (design) | Terms §13; disclosures `cancellation` / `accountSubscription` |
| Cancel stops future renewal; access usually to period end | Done (copy) | Except immediate cancel on account delete |
| Users told to cancel before renewal to avoid next charge | Done | disclosures `pricingNearCta` |

---

## 4. Refunds via Paddle

| Check | Status | Notes |
|-------|--------|-------|
| Refunds / statutory withdrawal deferred to Paddle policies + mandatory law | Done (copy) | Terms §14 |
| Kaify does not promise refund outside law/Paddle process | Done | Terms §14 |
| Account deletion does **not** auto-create refund | Done | Privacy §15; disclosures |
| Support path for product access vs billing disputes | Partial | support@kaifyai.org + paddle.net — document playbook for support |

---

## 5. Price change process

| Check | Status | Notes |
|-------|--------|-------|
| Terms: future price changes after notice; consent where required | Done (copy) | Terms §15 |
| Creating a new catalog price ≠ auto-updating existing subs | Done (copy) | Terms §15; eng must use Paddle Billing update flow |
| Preview proration before user-initiated plan changes | TODO ops | Engineering + Paddle dashboard process |
| Automated user notice email / in-app for increases | TODO | LEGAL_FACTS_REQUIRED F22 |

---

## 6. Webhook coverage and gaps

Configured / intended subscription events (see `scripts/setup-paddle-webhook.mjs`):

- `subscription.created`
- `subscription.updated`
- `subscription.activated`
- `subscription.resumed`
- `subscription.canceled` / `subscription.cancelled`

| Gap | Risk | Recommended action |
|-----|------|--------------------|
| **No refund webhook** (e.g. `transaction.refunded` / adjustment events) subscribed/handled | Paid entitlement may remain after Paddle refund/chargeback until manual fix | Subscribe + handle refund/adjustment events; sync tier down |
| Transaction lifecycle events not in setup script | Incomplete billing audit | Evaluate `transaction.*` needs with finance |
| Failed payment / past-due messaging | Product may lag Paddle status | Confirm `subscription.updated` covers past_due → UX |

Webhook route: `POST /api/webhooks/paddle` (signature verified).

---

## 7. Account delete vs subscription cancel

| Action | Effect on subscription | Effect on account | Refund? |
|--------|------------------------|-------------------|---------|
| **Manage billing → cancel** | Stops renewal; access usually until paid period ends | Account remains | No (unless Paddle/law) |
| **Delete account** | Cancels **live** Paddle subscriptions **immediately** when cancel API succeeds, then deletes Kaify data | Account erased (cascade; billing audit anonymized) | **No** automatic refund |
| **Paddle refund** | Per Paddle | May require Kaify to revoke paid features | Via Paddle |

Evidence: Privacy §15; Terms §13; `tests/unit/billing-cancel-on-delete.test.ts`; `deletion-behavior.md`.

---

## 8. Sign-off

| Item | Owner | Date | Result |
|------|-------|------|--------|
| Counsel review of MoR / refund / withdrawal wording | | | ☐ Pending — do not mark approved without counsel |
| Eng: refund webhook implemented | | | ☐ Open |
| Eng: price-change notice runbook | | | ☐ Open |

Contact: support@kaifyai.org (billing assist) · privacy@kaifyai.org (privacy role questions)
