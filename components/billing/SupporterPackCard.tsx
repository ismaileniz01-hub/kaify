"use client";

import { useCallback, useState } from "react";
import { Check, Heart } from "lucide-react";
import { usePaddle } from "@/components/billing/PaddleProvider";
import { InlineAlert } from "@/components/InlineAlert";
import { useSessionOptional } from "@/lib/session-contexts";
import { useLang } from "@/lib/lang-context";
import {
  SUPPORTER_PACK_AMOUNT_EUR,
  getPaddleSupporterPriceId,
} from "@/lib/billing/paddle-config";

const PERK_KEYS = [
  "pricing.supporter.perk.badge",
  "pricing.supporter.perk.early_access",
  "pricing.supporter.perk.priority",
] as const;

/**
 * One-time "Founding Supporter" pack (Paddle one-time price, 2500 EUR), shown
 * as the 4th plan card in the pricing grid.
 * Guest checkout: no Kaify account needed — Paddle collects the buyer's email.
 * When the visitor is signed in, the purchase is linked to their profile.
 * Sold as a product with a deliverable — Paddle does not allow plain donations.
 */
export function SupporterPackCard() {
  const { paddle, ready, configured, completedPriceId } = usePaddle();
  const session = useSessionOptional();
  const { t, lang } = useLang();
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const priceId = getPaddleSupporterPriceId();
  const purchased = completedPriceId === priceId;

  const price = new Intl.NumberFormat(lang, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(SUPPORTER_PACK_AMOUNT_EUR);

  const handleClick = useCallback(() => {
    void (async () => {
      setError(null);
      setOpening(true);
      try {
        const { shouldOpenPaddleCheckoutInApp, WEB_PRICING_URL } = await import(
          "@/lib/billing/native-web-checkout"
        );
        if (!(await shouldOpenPaddleCheckoutInApp())) {
          const { openExternalUrl } = await import("@/lib/native/open-external");
          await openExternalUrl(`${WEB_PRICING_URL}#supporter`);
          return;
        }
        // Optional: link to the signed-in profile. Guests continue without one.
        let userId = session?.profile?.id ?? null;
        if (!userId) {
          const { fetchWebCheckoutProfile } = await import(
            "@/lib/billing/web-checkout-profile"
          );
          userId = (await fetchWebCheckoutProfile())?.id ?? null;
        }
        if (configured && ready && paddle) {
          paddle.Checkout.open({
            items: [{ priceId, quantity: 1 }],
            customData: {
              kind: "supporter_pack",
              ...(userId ? { user_id: userId } : {}),
            },
          });
          return;
        }
        setError(t("pricing.checkout_unavailable"));
      } finally {
        setOpening(false);
      }
    })();
  }, [configured, paddle, priceId, ready, session?.profile?.id, t]);

  return (
    <div id="supporter" className="pricing-plan-column scroll-mt-28">
      <article className="pricing-card pricing-card--supporter">
        <div className="pricing-card-header">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-rose-400" aria-hidden />
            <h2 className="text-xl font-bold text-white">
              {t("pricing.supporter.title")}
            </h2>
          </div>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            {t("pricing.supporter.one_time")}
          </p>
        </div>

        <div className="pricing-card-price">
          <span className="pricing-amount">{price}</span>
        </div>
        <p className="mt-1 text-xs text-zinc-500">{t("pricing.supporter.no_account")}</p>

        <p className="mt-4 text-sm leading-relaxed text-zinc-400">
          {t("pricing.supporter.description")}
        </p>

        <ul className="mt-6 flex flex-1 flex-col gap-2.5">
          {PERK_KEYS.map((key) => (
            <li key={key} className="flex items-start gap-2 text-sm text-zinc-300">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{t(key)}</span>
            </li>
          ))}
        </ul>

        {purchased ? (
          <p role="status" className="mt-8 text-center text-sm font-semibold text-emerald-400">
            {t("pricing.supporter.thanks")}
          </p>
        ) : (
          <button
            type="button"
            onClick={handleClick}
            disabled={opening}
            className="landing-btn landing-btn--ghost mt-8 w-full"
          >
            {t("pricing.supporter.cta")}
          </button>
        )}
        {error ? (
          <div className="mt-4">
            <InlineAlert message={error} />
          </div>
        ) : null}
      </article>
    </div>
  );
}
