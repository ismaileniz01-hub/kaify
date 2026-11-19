"use client";

import { useCallback, useState } from "react";
import { Heart } from "lucide-react";
import { usePaddle } from "@/components/billing/PaddleProvider";
import { InlineAlert } from "@/components/InlineAlert";
import { useSessionOptional } from "@/lib/session-contexts";
import { useLang } from "@/lib/lang-context";
import {
  SUPPORTER_PACK_AMOUNT_EUR,
  getPaddleSupporterPriceId,
} from "@/lib/billing/paddle-config";

/**
 * One-time "Founding Supporter" pack (Paddle one-time price, 2500 EUR).
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
    <div
      id="supporter"
      className="landing-cta-panel mx-auto max-w-2xl scroll-mt-28 text-center"
    >
      <Heart className="mx-auto h-8 w-8 text-rose-400" aria-hidden />
      <h2 className="mt-4 text-2xl font-bold text-white md:text-3xl">
        {t("pricing.supporter.title")}
      </h2>
      <p className="mx-auto mt-3 max-w-lg text-zinc-400">
        {t("pricing.supporter.description")}
      </p>
      <ul className="mx-auto mt-6 max-w-md space-y-2 text-left text-sm text-zinc-300">
        <li>• {t("pricing.supporter.perk.badge")}</li>
        <li>• {t("pricing.supporter.perk.early_access")}</li>
        <li>• {t("pricing.supporter.perk.priority")}</li>
      </ul>
      <p className="mt-6 text-3xl font-bold text-white">{price}</p>
      <p className="text-xs text-zinc-500">{t("pricing.supporter.one_time")}</p>
      {purchased ? (
        <p role="status" className="mt-6 font-semibold text-emerald-400">
          {t("pricing.supporter.thanks")}
        </p>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          disabled={opening}
          className="landing-btn landing-btn--primary landing-btn--lg mt-6"
        >
          {t("pricing.supporter.cta")}
        </button>
      )}
      <p className="mt-3 text-xs text-zinc-500">{t("pricing.supporter.no_account")}</p>
      {error ? (
        <div className="mt-4">
          <InlineAlert message={error} />
        </div>
      ) : null}
    </div>
  );
}
