"use client";

import { useEffect, useMemo, useState } from "react";
import { Leaf, Sparkles, ArrowRight } from "lucide-react";
import { apiPost, ApiClientError } from "@/lib/api/client";
import { useSession } from "@/lib/session-context";
import { useLang } from "@/lib/lang-context";
import { errorToMessage } from "@/lib/i18n/api-error";
import type { ProfileDTO } from "@/lib/types/domain.types";
import {
  GENDERS,
  EXPERIENCE_LEVELS,
  type Gender,
  type ExperienceLevel,
} from "@/lib/validations/onboarding.schema";

/**
 * First-run onboarding gate. When an authenticated user's profile is still in
 * the `PAID` state (forms not yet filled), this blocks the app with a modal
 * that collects the required profile data and posts it to /api/onboarding
 * (PAID -> FORMS_COMPLETED). Mount once near the app root.
 */
export function OnboardingGate() {
  const { isAuthenticated, isLoading, profile, refreshSession } = useSession();
  const { lang, t } = useLang();

  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState<Gender>("prefer_not_to_say");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [experienceLevel, setExperienceLevel] =
    useState<ExperienceLevel>("beginner");
  const [isNatural, setIsNatural] = useState(true);
  const [bio, setBio] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const genderLabel = (g: Gender) => t(`onboarding.gender.${g}` as "onboarding.gender.male");
  const experienceLabel = (level: ExperienceLevel) =>
    t(`onboarding.experience.${level}` as "onboarding.experience.beginner");

  const needsOnboarding =
    isAuthenticated && !isLoading && profile?.onboardingStatus === "PAID";

  useEffect(() => {
    if (needsOnboarding && profile) {
      setDisplayName((prev) => prev || profile.displayName || "");
    }
  }, [needsOnboarding, profile]);

  const heightNum = Number.parseInt(heightCm, 10);
  const weightNum = Number.parseFloat(weightKg);

  const valid = useMemo(() => {
    return (
      displayName.trim().length >= 1 &&
      Number.isFinite(heightNum) &&
      heightNum >= 50 &&
      heightNum <= 280 &&
      Number.isFinite(weightNum) &&
      weightNum >= 20 &&
      weightNum <= 500
    );
  }, [displayName, heightNum, weightNum]);

  if (!needsOnboarding) return null;

  const handleSubmit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiPost<ProfileDTO>("/api/onboarding", {
        displayName: displayName.trim(),
        gender,
        heightCm: heightNum,
        weightKg: weightNum,
        experienceLevel,
        isNatural,
        bio: bio.trim(),
        locale: lang,
      });
      await refreshSession();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(errorToMessage(err, t));
      } else {
        setError(t("onboarding.error"));
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative mx-4 max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-3xl border border-white/10 bg-zinc-900 shadow-2xl">
        <div className="border-b border-white/5 px-6 py-5">
          <h2 className="text-lg font-bold text-white">{t("onboarding.title")}</h2>
          <p className="mt-1 text-xs text-zinc-400">{t("onboarding.subtitle")}</p>
        </div>

        <div className="flex flex-col gap-4 px-6 py-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              {t("onboarding.name")}
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={80}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-purple-500/50 focus:bg-purple-500/5"
              placeholder={t("onboarding.name_placeholder")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              {t("onboarding.gender")}
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-purple-500/50 focus:bg-purple-500/5"
            >
              {GENDERS.map((g) => (
                <option key={g} value={g} className="bg-zinc-900">
                  {genderLabel(g)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                {t("onboarding.height")}
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-purple-500/50 focus:bg-purple-500/5"
                placeholder={t("onboarding.height_placeholder")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                {t("onboarding.weight")}
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-purple-500/50 focus:bg-purple-500/5"
                placeholder={t("onboarding.weight_placeholder")}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              {t("onboarding.experience")}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {EXPERIENCE_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setExperienceLevel(level)}
                  className={`rounded-xl border py-2.5 text-xs font-medium transition ${
                    experienceLevel === level
                      ? "border-purple-500/50 bg-purple-500/15 text-purple-300"
                      : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20"
                  }`}
                >
                  {experienceLabel(level)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              {t("onboarding.status")}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsNatural(true)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition ${
                  isNatural
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400"
                    : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20"
                }`}
              >
                <Leaf className="h-4 w-4" />
                {t("onboarding.natural")}
              </button>
              <button
                type="button"
                onClick={() => setIsNatural(false)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition ${
                  !isNatural
                    ? "border-amber-500/50 bg-amber-500/15 text-amber-400"
                    : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20"
                }`}
              >
                <Sparkles className="h-4 w-4" />
                {t("onboarding.enhanced")}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              {t("onboarding.bio")}
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              maxLength={1000}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-purple-500/50 focus:bg-purple-500/5"
              placeholder={t("onboarding.bio_placeholder")}
            />
          </div>

          {error && <p className="text-center text-xs text-red-300">{error}</p>}

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!valid || submitting}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-full bg-purple-500 py-3.5 text-sm font-semibold text-white shadow-xl transition hover:bg-purple-400 active:scale-95 disabled:opacity-40"
          >
            {submitting ? t("onboarding.submitting") : t("onboarding.submit")}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
