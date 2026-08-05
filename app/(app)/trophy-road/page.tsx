"use client";

import { Check, ShoppingCart, Sparkles, PartyPopper } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { InlineAlert } from "@/components/InlineAlert";
import { useSession } from "@/lib/session-context";
import { apiGet, apiPost, apiPatch } from "@/lib/api/client";
import { GemBalance } from "@/components/GemBalance";
import { FreezieBalance } from "@/components/FreezieBalance";
import { GemIcon } from "@/components/GemIcon";
import { useGem } from "@/lib/gem-context";
import { useKai } from "@/lib/kai-context";
import { useLang } from "@/lib/lang-context";
import { errorToMessage } from "@/lib/i18n/api-error";
import { DailyChestBanner } from "@/components/market/DailyChestBanner";
import { MarketAuraPreview } from "@/components/market/MarketAuraPreview";
import { EmptyState } from "@/components/EmptyState";
import { MARKET_EFFECTS, type MarketEffect } from "@/lib/market-catalog";
import { AppHeader } from "@/components/navigation/AppHeader";

type EffectColor = MarketEffect;

const EFFECTS = MARKET_EFFECTS;
const STANDARD_EFFECTS = EFFECTS.filter((e) => !e.premium);
const PREMIUM_EFFECTS = EFFECTS.filter((e) => e.premium);

function MarketSectionHeader({
  id,
  label,
  description,
  premium = false,
}: {
  id: string;
  label: string;
  description?: string;
  premium?: boolean;
}) {
  return (
    <div className="market-section__heading">
      <div className="min-w-0">
        <h2
          id={id}
          className={`type-label ${premium ? "text-amber-300" : "text-purple-300"}`}
        >
          {label}
        </h2>
        {description ? (
          <p className="type-caption mt-1 max-w-[30ch] text-zinc-500">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

export default function MarketPage() {
  const { t } = useLang();
  const { gemState, spend, refreshBalance } = useGem();
  const { ownedEffects, purchaseEffect, setAuraColor, auraColor, syncFromServer } = useKai();
  const { isAuthenticated, isLoading, refreshSession, streak } = useSession();
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [applying, setApplying] = useState<string | null>(null);
  const [successEffect, setSuccessEffect] = useState<EffectColor | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshMarketState = useCallback(async () => {
    if (!isAuthenticated) return;
    const state = await apiGet<{ ownedIds: string[]; activeAura: string }>("/api/market");
    syncFromServer(state.ownedIds, state.activeAura);
  }, [isAuthenticated, syncFromServer]);

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    void refreshMarketState().catch(() => undefined);
  }, [isAuthenticated, isLoading, refreshMarketState]);

  const handleBuy = async (effect: EffectColor) => {
    if (ownedEffects.includes(effect.id)) return;
    if (gemState.balance < effect.price) return;

    setPurchasing(effect.id);
    setError(null);

    if (isAuthenticated) {
      try {
        await apiPost<{ balance: number; itemId: string; activeAura: string }>(
          "/api/market/purchase",
          { itemId: effect.id },
        );
        await refreshMarketState();
        await refreshBalance?.();
        setSuccessEffect(effect);
      } catch (err) {
        setError(errorToMessage(err, t) || t("market.error.purchase"));
      } finally {
        setPurchasing(null);
      }
      return;
    }

    setTimeout(() => {
      const success = spend(effect.price, t("market.guest_purchase", { name: t(effect.nameKey) }));
      if (success) {
        purchaseEffect(effect.id);
        setSuccessEffect(effect);
      } else {
        setError(t("market.insufficient"));
      }
      setPurchasing(null);
    }, 800);
  };

  const handleApply = async (effect: EffectColor) => {
    setError(null);
    if (isAuthenticated) {
      setApplying(effect.id);
      try {
        await apiPatch<{ activeAura: string }>("/api/market/purchase", {
          itemId: effect.id,
        });
        await refreshMarketState();
      } catch (err) {
        setError(errorToMessage(err, t) || t("market.error.apply"));
        setApplying(null);
        return;
      }
      setApplying(null);
    } else {
      setAuraColor(effect.id);
    }
    setSuccessEffect(null);
  };

  const showGridSkeleton = isAuthenticated && isLoading;

  const renderEffectCard = (effect: EffectColor) => {
    const isOwned = ownedEffects.includes(effect.id);
    const isActive = auraColor === effect.id;
    const isBuying = purchasing === effect.id;
    const isApplying = applying === effect.id;
    const canAfford = gemState.balance >= effect.price;

    return (
      <div
        key={effect.id}
        className={`relative overflow-hidden rounded-3xl border bg-black/20 ${effect.borderColor} shadow-lg transition-[transform,border-color,box-shadow,opacity] duration-200 ${
          isBuying ? "scale-[0.985] opacity-70" : ""
        } ${isActive ? "ring-2 ring-white/25" : ""} ${effect.premium ? "border-amber-400/40 shadow-amber-950/20" : "shadow-black/25"}`}
      >
        {effect.premium && (
          <span className="absolute right-2 top-2 z-10 rounded-full border border-amber-400/40 bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold tracking-wide text-amber-200">
            {t("market.premium_badge")}
          </span>
        )}

        <div className={`absolute inset-0 bg-gradient-to-b ${effect.bgGradient} opacity-60`} />

        <div className="relative flex items-center justify-center pb-3 pt-6">
          <MarketAuraPreview auraId={effect.id} />
        </div>

        <div className="relative px-3 pb-4 text-center">
          <h3 className="text-sm font-semibold tracking-tight text-white">{t(effect.nameKey)}</h3>
          <p className="mt-1 flex items-center justify-center gap-1 text-xs text-zinc-400">
            <span>{effect.price}</span>
            <GemIcon size={12} />
          </p>
          {isActive && (
            <span className="mt-1 inline-block rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/60">
              {t("market.active")}
            </span>
          )}
        </div>

        <div className="relative px-3 pb-4">
          {isOwned ? (
            isActive ? (
              <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2.5 text-sm font-medium text-emerald-400">
                <Check className="h-4 w-4" />
                {t("market.in_use")}
              </div>
            ) : (
              <button
                onClick={() => void handleApply(effect)}
                disabled={isApplying}
                className={`flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${effect.gradient} py-2.5 text-sm font-medium text-white shadow-lg ${effect.glowColor} transition active:scale-95 hover:opacity-90 disabled:opacity-60`}
              >
                {isApplying ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    {t("market.applying")}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    {t("market.apply")}
                  </>
                )}
              </button>
            )
          ) : (
            <button
              onClick={() => handleBuy(effect)}
              disabled={!canAfford || isBuying}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition active:scale-95 ${
                canAfford
                  ? `bg-gradient-to-r ${effect.gradient} text-white shadow-lg ${effect.glowColor} hover:opacity-90`
                  : "cursor-not-allowed border border-zinc-700 bg-zinc-800/50 text-zinc-500"
              }`}
            >
              {isBuying ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {t("market.buying")}
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4" />
                  {canAfford ? t("market.buy") : t("market.insufficient")}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="phone-shell welcome-gradient relative flex flex-col">
      <AppHeader
        backHref="/welcome"
        backLabel={t("nav.back")}
        title={t("market.title")}
        trailing={
          <>
            <GemBalance balance={gemState.balance} size="sm" />
            {isAuthenticated && (
              <FreezieBalance size="sm" balance={streak.freezieBalance} />
            )}
          </>
        }
      />

      <main className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-8 pt-4">
        <DailyChestBanner
          onClaimed={() => {
            void refreshBalance?.();
            void refreshSession();
          }}
        />

        {error && (
          <InlineAlert
            message={error}
            onDismiss={() => setError(null)}
            retryLabel={t("common.retry")}
          />
        )}

        {successEffect && (
          <div className="relative overflow-hidden rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-emerald-900/35 to-emerald-950/20 px-5 py-6 text-center shadow-xl shadow-emerald-950/20">
            <PartyPopper className="relative mx-auto mb-3 h-8 w-8 text-emerald-400" />
            <h3 className="relative text-base font-bold text-emerald-300">
              {t("market.purchase_success")}
            </h3>
            <p className="relative mt-1 text-sm text-emerald-200/70">
              <span className={`bg-gradient-to-r ${successEffect.gradient} bg-clip-text font-semibold text-transparent`}>
                {t(successEffect.nameKey)}
              </span>{" "}
              {t("market.earned_effect", { name: "" })}
            </p>

            <button
              onClick={() => handleApply(successEffect)}
              className={`touch-44 relative mx-auto mt-4 flex items-center gap-2 rounded-2xl bg-gradient-to-r ${successEffect.gradient} px-6 py-2.5 text-sm font-semibold text-white shadow-lg active:scale-[0.98] hover:opacity-90`}
            >
              <Sparkles className="h-4 w-4" />
              {t("market.apply")}
            </button>
          </div>
        )}

        {showGridSkeleton ? (
          <section className="market-section" aria-labelledby="market-standard-title">
            <MarketSectionHeader
              id="market-standard-title"
              label={t("market.catalog")}
              description={t("market.catalog.desc")}
            />
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="premium-skeleton h-52 rounded-3xl" />
              ))}
            </div>
          </section>
        ) : STANDARD_EFFECTS.length === 0 && PREMIUM_EFFECTS.length === 0 ? (
          <EmptyState
            title={t("market.empty.title")}
            subtitle={t("market.empty.subtitle")}
            icon={<ShoppingCart className="h-5 w-5" aria-hidden />}
            tone="info"
          />
        ) : (
          <>
            <section className="market-section" aria-labelledby="market-standard-title">
              <MarketSectionHeader
                id="market-standard-title"
                label={t("market.catalog")}
                description={t("market.catalog.desc")}
              />
              <div className="grid grid-cols-2 gap-3">
                {STANDARD_EFFECTS.map((effect) => renderEffectCard(effect))}
              </div>
            </section>

            {PREMIUM_EFFECTS.length > 0 && (
              <section
                className="market-section mt-4"
                data-premium="true"
                aria-labelledby="market-premium-title"
              >
                <MarketSectionHeader
                  id="market-premium-title"
                  label={t("market.premium_section")}
                  premium
                />
                <div className="grid grid-cols-2 gap-3">
                  {PREMIUM_EFFECTS.map((effect) => renderEffectCard(effect))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
