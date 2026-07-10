"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Check,
  Crown,
  Flame,
  Gem,
  Leaf,
  LogOut,
  MapPin,
  Pencil,
  Ruler,
  Settings,
  Sparkles,
  User,
  VenusAndMars,
  Weight,
  X,
  Zap,
} from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { FloatingOrbs } from "@/components/landing/FloatingOrbs";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { FitnessWallpaper } from "@/components/FitnessWallpaper";
import { InlineAlert } from "@/components/InlineAlert";
import { formatTierLabel } from "@/lib/billing/tier-labels";
import { hasActiveSubscription } from "@/lib/auth/post-auth-redirect";
import { useLang } from "@/lib/lang-context";
import { useSession } from "@/lib/session-context";
import type { UserProfile } from "@/lib/user";

function experienceLabel(
  level: string | null | undefined,
  t: (key: string) => string,
): string {
  if (!level) return "—";
  const key = `onboarding.experience.${level}`;
  const translated = t(key);
  if (translated !== key) return translated;
  return level.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatGender(
  gender: string | null | undefined,
  t: (key: string) => string,
): string {
  switch (gender) {
    case "male":
      return t("profile.gender_male");
    case "female":
      return t("profile.gender_female");
    case "prefer_not_to_say":
      return t("profile.gender_unspecified");
    default:
      return gender ?? "—";
  }
}

function formatMemberSince(iso: string | undefined, locale: string): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(locale, {
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function tierIcon(tier: string | null | undefined) {
  if (tier === "premium_max") return <Crown className="h-4 w-4 text-amber-400" />;
  if (tier === "pro") return <Zap className="h-4 w-4 text-purple-300" />;
  if (tier === "essential") return <Sparkles className="h-4 w-4 text-zinc-300" />;
  return <Sparkles className="h-4 w-4 text-zinc-500" />;
}

export function MyAccountPage() {
  const router = useRouter();
  const { t, lang } = useLang();
  const {
    isAuthenticated,
    isLoading,
    profile,
    userProfile,
    updateProfile,
    signOut,
    gemBalance,
    streak,
    referralCode,
  } = useSession();

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/login?next=/myaccount");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (userProfile?.name) setNameDraft(userProfile.name);
  }, [userProfile?.name]);

  if (isLoading || !isAuthenticated || !profile || !userProfile) {
    return (
      <div className="landing-site flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-purple-500/30 border-t-purple-400" />
      </div>
    );
  }

  const avatarSrc = avatarPreview ?? userProfile.avatar;
  const hasPlan = hasActiveSubscription(profile.tier);
  const appHref = hasPlan ? "/welcome" : "/pricing";

  const persistProfile = async (next: UserProfile) => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await updateProfile(next);
      setAvatarPreview(null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch {
      setSaveError(t("profile.save_error"));
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = (file: File | null) => {
    if (!file || saving) return;
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAvatarPreview(dataUrl);
      void persistProfile({ ...userProfile, avatar: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveName = async () => {
    if (!nameDraft.trim()) {
      setSaveError(t("profile.validation.name_required"));
      return;
    }
    await persistProfile({ ...userProfile, name: nameDraft.trim() });
    setEditingName(false);
  };

  const handleCancelName = () => {
    setNameDraft(userProfile.name);
    setEditingName(false);
    setSaveError(null);
  };

  const infoRows = [
    {
      icon: VenusAndMars,
      label: t("profile.field_gender"),
      value: formatGender(profile.gender, t),
    },
    {
      icon: Ruler,
      label: t("profile.field_height"),
      value: userProfile.height,
    },
    {
      icon: Weight,
      label: t("profile.field_weight"),
      value: userProfile.weight,
    },
    {
      icon: MapPin,
      label: t("profile.field_location"),
      value: userProfile.location,
    },
    {
      icon: User,
      label: t("onboarding.experience"),
      value: experienceLabel(profile.experienceLevel, t),
    },
    {
      icon: profile.isNatural ? Leaf : Sparkles,
      label: t("profile.field_status"),
      value: profile.isNatural
        ? t("profile.natural_badge")
        : t("profile.enhanced_badge"),
    },
  ];

  return (
    <div className="landing-site">
      <LandingNav pricingPage accountPage />
      <main>
        <section className="account-hero relative overflow-hidden pb-16 pt-28 sm:pt-36">
          <div className="absolute inset-0">
            <FitnessWallpaper softVignette />
          </div>
          <FloatingOrbs />
          <div className="landing-hero-glow" aria-hidden />

          <div className="landing-container relative z-10">
            <ScrollReveal>
              <p className="mb-4 text-center text-sm font-semibold uppercase tracking-[0.28em] text-purple-300/80">
                {t("myaccount.eyebrow")}
              </p>
            </ScrollReveal>
            <ScrollReveal delay={80}>
              <h1 className="landing-hero-title text-center text-3xl sm:text-5xl">
                {t("myaccount.title")}
              </h1>
            </ScrollReveal>

            <ScrollReveal delay={160}>
              <div className="account-card mx-auto mt-10 max-w-3xl">
                <div className="account-card__glow" aria-hidden />

                <div className="relative flex flex-col items-center border-b border-white/8 px-6 py-8 sm:px-10">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={saving}
                    className="group relative mb-5"
                    aria-label={t("profile.change_photo")}
                  >
                    <div className="absolute -inset-3 rounded-full bg-gradient-to-br from-purple-500/35 to-violet-600/20 blur-2xl transition group-hover:from-purple-500/50" />
                    <div className="relative h-28 w-28 overflow-hidden rounded-full border-2 border-purple-400/40 shadow-[0_0_40px_rgba(168,85,247,0.25)] sm:h-32 sm:w-32">
                      <Image
                        src={avatarSrc}
                        alt={userProfile.name}
                        width={128}
                        height={128}
                        className="h-full w-full object-cover"
                        unoptimized={avatarSrc.startsWith("data:")}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition group-hover:opacity-100">
                        <Camera className="h-7 w-7 text-white" />
                      </div>
                    </div>
                    <span className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-zinc-900 text-purple-300 shadow-lg">
                      <Camera className="h-4 w-4" />
                    </span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      handleAvatarChange(e.target.files?.[0] ?? null);
                      e.target.value = "";
                    }}
                  />

                  {editingName ? (
                    <div className="flex w-full max-w-sm flex-col items-center gap-3">
                      <input
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        placeholder={t("profile.placeholder_name")}
                        className="account-input w-full text-center text-lg font-semibold"
                        maxLength={80}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleCancelName}
                          disabled={saving}
                          className="account-btn account-btn--ghost"
                        >
                          <X className="h-4 w-4" />
                          {t("profile.cancel_button")}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleSaveName()}
                          disabled={saving}
                          className="account-btn account-btn--primary"
                        >
                          <Check className="h-4 w-4" />
                          {saving ? t("profile.saving") : t("profile.save_button")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-bold text-white sm:text-3xl">
                        {userProfile.name}
                      </h2>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingName(true);
                          setSaveError(null);
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 transition hover:border-purple-400/40 hover:text-white"
                        aria-label={t("myaccount.edit_name")}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  <p className="mt-2 text-sm text-zinc-500">
                    {t("myaccount.member_since", {
                      date: formatMemberSince(profile.createdAt, lang),
                    })}
                  </p>

                  {(saveError || saveSuccess) && (
                    <div className="mt-4 w-full max-w-md">
                      {saveError && (
                        <InlineAlert variant="error" message={saveError} />
                      )}
                      {saveSuccess && (
                        <InlineAlert variant="success" message={t("myaccount.saved")} />
                      )}
                    </div>
                  )}
                </div>

                <div className="grid gap-4 px-6 py-6 sm:grid-cols-3 sm:px-10 sm:py-8">
                  <div className="account-stat">
                    <Gem className="h-5 w-5 text-purple-300" />
                    <div>
                      <p className="account-stat__label">{t("myaccount.gems")}</p>
                      <p className="account-stat__value">{gemBalance.balance.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="account-stat">
                    <Flame className="h-5 w-5 text-orange-400" />
                    <div>
                      <p className="account-stat__label">{t("myaccount.streak")}</p>
                      <p className="account-stat__value">{streak.currentStreak}</p>
                    </div>
                  </div>
                  <div className="account-stat">
                    {tierIcon(profile.tier)}
                    <div>
                      <p className="account-stat__label">{t("myaccount.plan")}</p>
                      <p className="account-stat__value">{formatTierLabel(profile.tier)}</p>
                    </div>
                  </div>
                </div>

                {userProfile.bio ? (
                  <div className="border-t border-white/8 px-6 py-6 sm:px-10">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      {t("myaccount.bio")}
                    </p>
                    <p className="text-sm leading-relaxed text-zinc-300">{userProfile.bio}</p>
                  </div>
                ) : null}

                <div className="grid gap-3 border-t border-white/8 px-6 py-6 sm:grid-cols-2 sm:px-10 sm:py-8">
                  {infoRows.map((row) => (
                    <div key={row.label} className="account-info-row">
                      <row.icon className="h-4 w-4 shrink-0 text-purple-300/80" />
                      <div className="min-w-0">
                        <p className="text-xs text-zinc-500">{row.label}</p>
                        <p className="truncate text-sm font-medium text-zinc-100">{row.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {referralCode ? (
                  <div className="border-t border-white/8 px-6 py-5 sm:px-10">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      {t("myaccount.referral_code")}
                    </p>
                    <p className="mt-1 font-mono text-lg tracking-widest text-purple-200">
                      {referralCode}
                    </p>
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 border-t border-white/8 px-6 py-6 sm:flex-row sm:px-10">
                  <Link href={appHref} className="account-btn account-btn--primary flex-1 justify-center">
                    {hasPlan ? t("myaccount.open_app") : t("myaccount.choose_plan")}
                  </Link>
                  <Link
                    href="/settings"
                    className="account-btn account-btn--ghost flex-1 justify-center"
                  >
                    <Settings className="h-4 w-4" />
                    {t("myaccount.settings")}
                  </Link>
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    className="account-btn account-btn--ghost flex-1 justify-center text-red-300 hover:border-red-400/30 hover:text-red-200"
                  >
                    <LogOut className="h-4 w-4" />
                    {t("myaccount.sign_out")}
                  </button>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
