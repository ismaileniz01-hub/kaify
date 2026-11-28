import {
  LEGAL_ENTITY,
  LEGAL_URL,
  PADDLE_BUYER_TERMS_URL,
  PADDLE_REFUND_POLICY_URL,
  SUPPORT_EMAIL,
} from "@/lib/legal/constants";
import type { LegalDocument } from "./types";

export const REFUND_POLICY_UPDATED = "November 28, 2026";

export const REFUND_DOCUMENT: LegalDocument = {
  title: "Refund Policy",
  subtitle: `Last updated: ${REFUND_POLICY_UPDATED} · English controlling`,
  intro: `This Refund Policy explains when payments for Kaify Ai (${LEGAL_URL}) can be refunded. In short: all payments are final, except where mandatory consumer law gives you a right that cannot be waived. Nothing in this policy limits those rights.`,
  sections: [
    {
      id: "merchant",
      title: "1. Who handles payments and refunds",
      blocks: [
        {
          type: "p",
          text: `Paddle acts as Merchant of Record and reseller for every Kaify Ai purchase. Payments, refunds and chargebacks are processed by Paddle under the Paddle Buyer Terms (${PADDLE_BUYER_TERMS_URL}) and the Paddle Refund Policy (${PADDLE_REFUND_POLICY_URL}). If this policy and a mandatory provision of the Paddle Refund Policy or applicable law conflict, the mandatory provision applies. ${LEGAL_ENTITY} provides the service and decides which voluntary refunds it supports; it supports none beyond those listed here.`,
        },
      ],
    },
    {
      id: "final",
      title: "2. All payments are final",
      blocks: [
        {
          type: "p",
          text: "Except as stated in sections 3 and 4, payments are non-refundable and non-exchangeable. In particular, no refund is given for:",
        },
        {
          type: "ul",
          items: [
            "renewal payments of a subscription, including renewals you forgot to cancel;",
            "unused time, partial billing periods, or the remainder of a period after you cancel;",
            "downgrading to a cheaper plan or switching from yearly to monthly billing;",
            "dissatisfaction with AI-generated coaching, meal or body analyses, which are informational and not guaranteed to be accurate;",
            "not using the service, lack of time, change of mind, or results not meeting your expectations;",
            "discounted, promotional or gifted purchases, beyond what the law requires;",
            "suspension or termination of your account for a breach of the Terms of Service;",
            "problems caused by your device, network, operating system, third-party apps or app stores.",
          ],
        },
      ],
    },
    {
      id: "withdrawal",
      title: "3. Statutory right of withdrawal (cooling-off period)",
      blocks: [
        {
          type: "p",
          text: "Kaify Ai is a digital service that starts immediately. Before checkout you are asked to confirm that you request immediate access and that you understand you lose your right of withdrawal once the service starts, where the law allows this. You cannot buy a plan without this confirmation.",
        },
        {
          type: "ul",
          items: [
            "Türkiye: under Article 15(1)(ğ) of the Distance Contracts Regulation, the right of withdrawal does not apply to services performed instantly in electronic form. Purchases from Türkiye are therefore final once access is granted.",
            "European Union, EEA and United Kingdom: if you are a consumer you may withdraw within 14 days of your first payment (not renewals, except where UK law gives a new period on an annual renewal). Because you asked for the service to start during that period, the refund is reduced by an amount proportionate to the service supplied until you withdraw. Where the law treats the service as digital content and you gave the confirmation above, the right of withdrawal ends when the service starts.",
            "Other countries: only the withdrawal rights that your local mandatory consumer law grants apply.",
            "The withdrawal period ends 14 days after the transaction date. Requests after that date are not accepted, except under section 4.",
          ],
        },
      ],
    },
    {
      id: "faulty",
      title: "4. Faulty service",
      blocks: [
        {
          type: "p",
          text: `If the paid service does not work as described, report it to ${SUPPORT_EMAIL} within 30 days of noticing the fault, with your account email, the Paddle order number and a description or screenshot. We will first try to fix the problem or restore access within a reasonable time. A refund, reduced to the period the service did not work, is given only if we cannot bring the service into conformity, or where the law entitles you to it directly. Temporary outages, scheduled maintenance and changes to features under the Terms of Service are not faults.`,
        },
      ],
    },
    {
      id: "request",
      title: "5. How to request a refund",
      blocks: [
        {
          type: "ul",
          items: [
            "Use paddle.net (look up your order with the email used at checkout) or email us at the address above.",
            "Include the account email, the Paddle order number, the date of purchase and the legal basis of the request (withdrawal or faulty service).",
            "Requests without an order number or from a different email than the purchase may be refused until ownership is verified.",
            "Approved refunds are paid by Paddle to the original payment method. Processing times depend on Paddle and your bank.",
          ],
        },
      ],
    },
    {
      id: "effects",
      title: "6. What happens after a refund or chargeback",
      blocks: [
        {
          type: "p",
          text: "When a payment is refunded or charged back, the related paid access ends immediately, the subscription is cancelled, and any in-app rewards or benefits obtained with that payment may be removed. Opening a chargeback instead of using the process above may lead to suspension of the account while the dispute is open.",
        },
      ],
    },
    {
      id: "abuse",
      title: "7. Refund abuse",
      blocks: [
        {
          type: "p",
          text: "To the extent permitted by law, we may refuse a refund and close the account in case of fraud, use of stolen payment methods, repeated purchase-and-refund patterns, multiple accounts used to obtain repeated trials or refunds, or a breach of the Terms of Service.",
        },
      ],
    },
    {
      id: "cancel",
      title: "8. Cancelling is not a refund",
      blocks: [
        {
          type: "p",
          text: "You can cancel at any time in Settings → Manage billing or through the Paddle customer portal. Cancelling stops future renewals; access continues until the end of the period already paid and no refund is given for it. Deleting your account cancels the subscription immediately and does not create a refund.",
        },
      ],
    },
    {
      id: "changes",
      title: "9. Changes and your statutory rights",
      blocks: [
        {
          type: "p",
          text: "We may update this policy; the version in force at the time of your purchase applies to that purchase. Nothing in this policy excludes or limits rights you have under mandatory consumer law that cannot be waived by contract.",
        },
      ],
    },
  ],
};
