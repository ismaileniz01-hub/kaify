"use client";

import Link from "next/link";
import { ArrowLeft, Check, ShoppingCart, Sparkles, PartyPopper } from "lucide-react";
import { useState } from "react";
import { GemBalance } from "@/components/GemBalance";
import { useGem } from "@/lib/gem-context";
import { useKai, type AuraColor } from "@/lib/kai-context";

type EffectColor = {
  id: AuraColor;
  name: string;
  price: number;
  gradient: string;
  borderColor: string;
  glowColor: string;
  ringColor: string;
  sparkColor: string;
  bgGradient: string;
};

const EFFECTS: EffectColor[] = [
  {
    id: "blue",
    name: "Neon Mavi",
    price: 300,
    gradient: "from-cyan-400 to-blue-500",
    borderColor: "border-cyan-400/50",
    glowColor: "shadow-cyan-500/40",
    ringColor: "bg-cyan-400",
    sparkColor: "text-cyan-300",
    bgGradient: "from-cyan-900/30 via-transparent to-blue-900/20",
  },
  {
    id: "red",
    name: "Alev Kırmızı",
    price: 300,
    gradient: "from-red-500 to-orange-500",
    borderColor: "border-red-400/50",
    glowColor: "shadow-red-500/40",
    ringColor: "bg-red-400",
    sparkColor: "text-red-300",
    bgGradient: "from-red-900/30 via-transparent to-orange-900/20",
  },
  {
    id: "green",
    name: "Zümrüt Yeşil",
    price: 300,
    gradient: "from-emerald-400 to-green-500",
    borderColor: "border-emerald-400/50",
    glowColor: "shadow-emerald-500/40",
    ringColor: "bg-emerald-400",
    sparkColor: "text-emerald-300",
    bgGradient: "from-emerald-900/30 via-transparent to-green-900/20",
  },
  {
    id: "pink",
    name: "Pembe Işın",
    price: 300,
    gradient: "from-pink-400 to-rose-500",
    borderColor: "border-pink-400/50",
    glowColor: "shadow-pink-500/40",
    ringColor: "bg-pink-400",
    sparkColor: "text-pink-300",
    bgGradient: "from-pink-900/30 via-transparent to-rose-900/20",
  },
  {
    id: "purple",
    name: "Mor Efsane",
    price: 300,
    gradient: "from-purple-400 to-violet-500",
    borderColor: "border-purple-400/50",
    glowColor: "shadow-purple-500/40",
    ringColor: "bg-purple-400",
    sparkColor: "text-purple-300",
    bgGradient: "from-purple-900/30 via-transparent to-violet-900/20",
  },
  {
    id: "gold",
    name: "Altın İhtişam",
    price: 300,
    gradient: "from-yellow-400 to-amber-500",
    borderColor: "border-yellow-400/50",
    glowColor: "shadow-yellow-500/40",
    ringColor: "bg-yellow-400",
    sparkColor: "text-yellow-300",
    bgGradient: "from-yellow-900/30 via-transparent to-amber-900/20",
  },
  {
    id: "white",
    name: "Kutsal Parıltı",
    price: 300,
    gradient: "from-white/80 to-zinc-300",
    borderColor: "border-white/30",
    glowColor: "shadow-white/20",
    ringColor: "bg-white/60",
    sparkColor: "text-white",
    bgGradient: "from-zinc-800/30 via-transparent to-zinc-900/20",
  },
  {
    id: "orange",
    name: "Turuncu Ateş",
    price: 300,
    gradient: "from-orange-400 to-red-500",
    borderColor: "border-orange-400/50",
    glowColor: "shadow-orange-500/40",
    ringColor: "bg-orange-400",
    sparkColor: "text-orange-300",
    bgGradient: "from-orange-900/30 via-transparent to-red-900/20",
  },
  {
    id: "indigo",
    name: "Derin Lacivert",
    price: 300,
    gradient: "from-indigo-400 to-blue-600",
    borderColor: "border-indigo-400/50",
    glowColor: "shadow-indigo-500/40",
    ringColor: "bg-indigo-400",
    sparkColor: "text-indigo-300",
    bgGradient: "from-indigo-900/30 via-transparent to-blue-900/20",
  },
  {
    id: "electric",
    name: "Elektrik Çarpması",
    price: 400,
    gradient: "from-sky-400 to-cyan-500",
    borderColor: "border-sky-400/50",
    glowColor: "shadow-sky-500/40",
    ringColor: "bg-sky-400",
    sparkColor: "text-sky-300",
    bgGradient: "from-sky-900/30 via-transparent to-cyan-900/20",
  },
];

export default function MarketPage() {
  const { gemState, spend } = useGem();
  const { ownedEffects, purchaseEffect, setAuraColor, auraColor } = useKai();
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [successEffect, setSuccessEffect] = useState<EffectColor | null>(null);

  const handleBuy = (effect: EffectColor) => {
    if (ownedEffects.includes(effect.id)) return;
    if (gemState.balance < effect.price) return;

    setPurchasing(effect.id);

    // Satın alma animasyonu
    setTimeout(() => {
      const success = spend(effect.price, `${effect.name} efekti satın alındı`);
      if (success) {
        purchaseEffect(effect.id);
        setSuccessEffect(effect);
      }
      setPurchasing(null);
    }, 800);
  };

  const handleApply = (effect: EffectColor) => {
    setAuraColor(effect.id);
    setSuccessEffect(null);
  };

  return (
    <div className="phone-shell welcome-gradient relative flex flex-col">
      <header className="flex items-center gap-3 px-4 pb-2 pt-12">
        <Link
          href="/welcome"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Geri"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 text-center text-sm font-medium text-white">
          Market
        </h1>
        <GemBalance balance={gemState.balance} size="sm" animate />
      </header>

      <main className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-8 pt-4">
        {/* Banner */}
        <div className="rounded-2xl border border-purple-400/30 bg-gradient-to-r from-purple-900/40 to-violet-900/30 px-5 py-4 text-center">
          <Sparkles className="mx-auto mb-2 h-6 w-6 text-purple-300" />
          <h2 className="text-sm font-semibold text-white">Efekt Kataloğu</h2>
          <p className="mt-1 text-xs text-purple-200/60">
            {/* eslint-disable-next-line react/no-unescaped-entities */}
            Kai'nin aurasını kişiselleştir! 300 - 400 💎
          </p>
        </div>

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
              Satın Alma Başarılı! 🎉
            </h3>
            <p className="relative mt-1 text-sm text-emerald-200/70">
              <span className={`bg-gradient-to-r ${successEffect.gradient} bg-clip-text font-semibold text-transparent`}>
                {successEffect.name}
              </span>{" "}
              efektini kazandın!
            </p>

            {/* Uygula butonu */}
            <button
              onClick={() => handleApply(successEffect)}
              className={`relative mx-auto mt-4 flex items-center gap-2 rounded-xl bg-gradient-to-r ${successEffect.gradient} px-6 py-2.5 text-sm font-semibold text-white shadow-lg ${successEffect.glowColor} transition active:scale-95 hover:opacity-90`}
            >
              <Sparkles className="h-4 w-4" />
              Uygula
            </button>
          </div>
        )}

        {/* Efekt Grid */}
        <div className="grid grid-cols-2 gap-3">
          {EFFECTS.map((effect) => {
            const isOwned = ownedEffects.includes(effect.id);
            const isActive = auraColor === effect.id;
            const isBuying = purchasing === effect.id;
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
                  <h3 className="text-sm font-semibold text-white">{effect.name}</h3>
                  <p className="mt-1 text-xs text-zinc-400">{effect.price} 💎</p>
                  {isActive && (
                    <span className="mt-1 inline-block rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/60">
                      Aktif
                    </span>
                  )}
                </div>

                {/* Satın al / Uygula butonu */}
                <div className="relative px-3 pb-4">
                  {isOwned ? (
                    isActive ? (
                      <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2.5 text-sm font-medium text-emerald-400">
                        <Check className="h-4 w-4" />
                        Kullanılıyor
                      </div>
                    ) : (
                      <button
                        onClick={() => setAuraColor(effect.id)}
                        className={`flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${effect.gradient} py-2.5 text-sm font-medium text-white shadow-lg ${effect.glowColor} transition active:scale-95 hover:opacity-90`}
                      >
                        <Sparkles className="h-4 w-4" />
                        Uygula
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
                          Satın alınıyor...
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="h-4 w-4" />
                          {canAfford ? "Satın Al" : "Yetersiz Bakiye"}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
