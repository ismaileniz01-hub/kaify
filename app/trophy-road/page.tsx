"use client";

import Link from "next/link";
import { ArrowLeft, Check, ShoppingCart, Sparkles, PartyPopper } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { InlineAlert } from "@/components/InlineAlert";
import { useSession } from "@/lib/session-context";
import { apiGet, apiPost, apiPatch } from "@/lib/api/client";
import { GemBalance } from "@/components/GemBalance";
import { GemIcon } from "@/components/GemIcon";
import { useGem } from "@/lib/gem-context";
import { useKai, type AuraColor } from "@/lib/kai-context";
import { useLang } from "@/lib/lang-context";
import { errorToMessage } from "@/lib/i18n/api-error";
import { DailyChestBanner } from "@/components/market/DailyChestBanner";
import { MARKET_EFFECTS, type MarketEffect } from "@/lib/market-catalog";

type EffectColor = MarketEffect;

const EFFECTS = MARKET_EFFECTS;

export default function MarketPage() {
  const { t } = useLang();
  const { gemState, spend, refreshBalance } = useGem();
  const { ownedEffects, purchaseEffect, setAuraColor, auraColor, syncFromServer } = useKai();
  const { isAuthenticated, isLoading, refreshSession } = useSession();
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
        const result = await apiPost<{ balance: number; itemId: string; activeAura: string }>(
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
        const result = await apiPatch<{ activeAura: string }>("/api/market/purchase", {
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

  return (
    <div className="phone-shell welcome-gradient relative flex flex-col">
      <header className="flex items-center gap-3 px-4 pb-2 pt-12">
        <Link
          href="/welcome"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          aria-label={t("nav.back")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 text-center text-sm font-medium text-white">
          {t("market.title")}
        </h1>
        <GemBalance balance={gemState.balance} size="sm" animate />
      </header>

      <main className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-8 pt-4">
        <DailyChestBanner
          onClaimed={() => {
            void refreshBalance?.();
            void refreshSession();
          }}
        />

        {/* Banner */}
        <div className="rounded-2xl border border-purple-400/30 bg-gradient-to-r from-purple-900/40 to-violet-900/30 px-5 py-4 text-center">
          <Sparkles className="mx-auto mb-2 h-6 w-6 text-purple-300" />
          <h2 className="text-sm font-semibold text-white">{t("market.catalog")}</h2>
          <p className="mt-1 text-xs text-purple-200/60">
            {t("market.catalog.desc")}
          </p>
        </div>

        {error && (
          <InlineAlert
            message={error}
            onDismiss={() => setError(null)}
            retryLabel={t("common.retry")}
          />
        )}

        {/* Başarılı ekranı */}
        {successEffect && (
          <div className="relative overflow-hidden rounded-2xl border border-emerald-400/40 bg-gradient-to-b from-emerald-900/40 to-emerald-950/30 px-5 py-6 text-center">
            {/* Partikül animasyonu */}
            <div className="absolute inset-0 overflow-hidden">
              <span className="absolute left-1/4 top-2 h-2 w-2 animate-ping rounded-full bg-emerald-400/60" />
              <span className="absolute right-1/4 top-4 h-1.5 w-1.5 animate-ping rounded-full bg-emerald-300/50" style={{ animationDelay: "0.3s" }} />
              <span className="absolute left-1/3 bottom-6 h-2 w-2 animate-ping rounded-full bg-emerald-400/40" style={{ animationDelay: "0.6s" }} />
              <span className="absolute right-1/3 bottom-4 h-1.5 w-1.5 animate-ping rounded-full bg-emerald-300/50" style={{ animationDelay: "0.9s" }} />
            </div>

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

            {/* Uygula butonu */}
            <button
              onClick={() => handleApply(successEffect)}
              className={`relative mx-auto mt-4 flex items-center gap-2 rounded-xl bg-gradient-to-r ${successEffect.gradient} px-6 py-2.5 text-sm font-semibold text-white shadow-lg ${successEffect.glowColor} transition active:scale-95 hover:opacity-90`}
            >
              <Sparkles className="h-4 w-4" />
              {t("market.apply")}
            </button>
          </div>
        )}

        {/* Efekt Grid */}
        {showGridSkeleton ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-52 animate-pulse rounded-2xl bg-white/[0.06]" />
            ))}
          </div>
        ) : (
        <div className="grid grid-cols-2 gap-3">
          {EFFECTS.map((effect) => {
            const isOwned = ownedEffects.includes(effect.id);
            const isActive = auraColor === effect.id;
            const isBuying = purchasing === effect.id;
            const isApplying = applying === effect.id;
            const canAfford = gemState.balance >= effect.price;

            return (
              <div
                key={effect.id}
                className={`relative overflow-hidden rounded-2xl border ${effect.borderColor} ${effect.glowColor} shadow-lg transition-all duration-300 ${
                  isBuying ? "scale-95 opacity-70" : ""
                } ${isActive ? "ring-2 ring-white/30" : ""}`}
              >
                {/* Arka plan gradyanı */}
                <div className={`absolute inset-0 bg-gradient-to-b ${effect.bgGradient} opacity-60`} />

                {/* Efekt önizleme - dönen aura halkası */}
                <div className="relative flex items-center justify-center pt-6 pb-3">
                  {effect.id === "electric" ? (
                    /* Elektrik efekti özel önizleme - sadece efekt, resim yok */
                    <div className="relative h-20 w-20 flex items-center justify-center">
                      <div className="electric-aura" style={{ "--spark-color": "#7dd3fc" } as React.CSSProperties}>
                        <span className="electric-bolt" style={{ "--spark-color": "#7dd3fc" } as React.CSSProperties} />
                        <span className="electric-bolt" style={{ "--spark-color": "#7dd3fc" } as React.CSSProperties} />
                        <span className="electric-bolt" style={{ "--spark-color": "#7dd3fc" } as React.CSSProperties} />
                        <span className="electric-bolt" style={{ "--spark-color": "#7dd3fc" } as React.CSSProperties} />
                        <span className="electric-bolt" style={{ "--spark-color": "#7dd3fc" } as React.CSSProperties} />
                        <span className="electric-bolt" style={{ "--spark-color": "#7dd3fc" } as React.CSSProperties} />
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Dış halka */}
                      <div
                        className={`h-20 w-20 rounded-full border-2 ${effect.borderColor} ${effect.glowColor} flex items-center justify-center`}
                        style={{
                          animation: "fire-aura-pulse 1.5s ease-in-out infinite",
                          boxShadow: `0 0 30px 8px color-mix(in srgb, ${effect.id === "blue" ? "cyan" : effect.id === "red" ? "red" : effect.id === "green" ? "emerald" : effect.id === "pink" ? "pink" : effect.id === "gold" ? "yellow" : effect.id === "white" ? "white" : effect.id === "orange" ? "orange" : effect.id === "indigo" ? "indigo" : "purple"} 40%, transparent)`,
                        }}
                      >
                        {/* İç halka */}
                        <div
                          className={`h-12 w-12 rounded-full ${effect.ringColor} opacity-30 blur-sm`}
                        />
                      </div>

                      {/* Kıvılcımlar */}
                      <span
                        className={`absolute left-3 top-3 text-lg ${effect.sparkColor}`}
                        style={{ animation: "fire-aura-spark 1.5s ease-out infinite", animationDelay: "0s" }}
                      >
                        ✦
                      </span>
                      <span
                        className={`absolute right-3 bottom-3 text-lg ${effect.sparkColor}`}
                        style={{ animation: "fire-aura-spark 1.5s ease-out infinite", animationDelay: "0.5s" }}
                      >
                        ✦
                      </span>
                      <span
                        className={`absolute left-6 bottom-6 text-sm ${effect.sparkColor}`}
                        style={{ animation: "fire-aura-spark 1.5s ease-out infinite", animationDelay: "1s" }}
                      >
                        ✦
                      </span>
                    </>
                  )}
                </div>

                {/* İsim ve fiyat */}
                <div className="relative px-3 pb-4 text-center">
                  <h3 className="text-sm font-semibold text-white">{t(effect.nameKey)}</h3>
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

                {/* Satın al / Uygula butonu */}
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
          })}
        </div>
        )}
      </main>
    </div>
  );
}
