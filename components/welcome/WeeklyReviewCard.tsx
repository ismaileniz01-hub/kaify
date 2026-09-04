"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { WeeklyReview } from "@/lib/activation/weekly-review";
import { postClientProductEvent } from "@/lib/events/client-beacon";
import { useLang } from "@/lib/lang-context";
import { hapticSelection } from "@/lib/native/haptics";

export function WeeklyReviewCard({ review }: { review: WeeklyReview }) {
  const { t } = useLang();
  useEffect(() => {
    postClientProductEvent({
      name: "session.weekly_review_viewed",
      properties: { review_version: "v1" },
    });
  }, []);
  return (
    <Link
      href={review.href}
      className="block rounded-2xl border border-white/10 bg-white/[0.04] p-4"
      onClick={() => {
        void hapticSelection();
        postClientProductEvent({
          name: "session.weekly_review_completed",
          properties: { review_version: "v1" },
        });
        postClientProductEvent({
          name: "session.next_action_completed",
          properties: { action: review.nextAction },
        });
      }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200/80">
        {t("home.weekly_review.label")}
      </p>
      <p className="mt-1 text-base font-bold text-white">
        {t(review.titleKey as "home.weekly_review.continue.title")}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-zinc-300">
        {t(review.bodyKey as "home.weekly_review.continue.body", {
          workouts: String(review.workouts),
          meals: String(review.meals),
          water: String(review.waterDays),
          streak: String(review.streak),
        })}
      </p>
      <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-300">
        {t(review.ctaKey as "home.weekly_review.continue.cta")}
        <ArrowRight className="h-3.5 w-3.5" />
      </p>
    </Link>
  );
}
