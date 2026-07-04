"use client";

import { useState, useRef } from "react";
import { X, MapPin, Ruler, Weight, VenusAndMars, Leaf, Sparkles, Pencil, Check, Camera } from "lucide-react";
import Image from "next/image";
import type { UserProfile } from "@/lib/user";
import { useLang } from "@/lib/lang-context";

type ProfileModalProps = {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSave?: (updated: UserProfile) => Promise<void>;
};

export function ProfileModal({ isOpen, onClose, profile, onSave }: ProfileModalProps) {
  const { t, unit } = useLang();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<UserProfile>({ ...profile });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleChange = (field: keyof UserProfile, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!onSave || saving) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await onSave(form);
      setSaveSuccess(true);
      setEditing(false);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch {
      setSaveError(t("profile.save_error"));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({ ...profile });
    setEditing(false);
    setSaveError(null);
  };

  // Görüntüleme modu
  if (!editing) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="relative mx-4 w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
            <h2 className="text-sm font-semibold text-white">{t("profile.modal_title")}</h2>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Profil içeriği */}
          <div className="flex flex-col items-center px-6 py-6">
            {/* Avatar */}
            <div className="relative mb-4">
              <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-purple-500/30 to-violet-600/20 blur-xl" />
              <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-purple-400/30">
                <Image
                  src={profile.avatar}
                  alt={profile.name}
                  width={96}
                  height={96}
                  className="h-full w-full object-cover"
                />
              </div>
              {/* Natural rozeti */}
              <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30">
                {profile.isNatural ? (
                  <Leaf className="h-4 w-4 text-white" />
                ) : (
                  <Sparkles className="h-4 w-4 text-white" />
                )}
              </div>
            </div>

            {/* İsim */}
            <h3 className="text-lg font-bold text-white">{profile.name}</h3>

            {/* Natural / Değil etiketi */}
            <div className={`mt-1.5 flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-medium ${
              profile.isNatural
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-amber-500/15 text-amber-400"
            }`}>
              {profile.isNatural ? (
                <>
                  <Leaf className="h-3 w-3" />
                  {t("profile.natural_badge")}
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3" />
                  {t("profile.enhanced_badge")}
                </>
              )}
            </div>

            {/* Bio */}
            <p className="mt-4 text-center text-xs leading-relaxed text-zinc-400">
              {profile.bio}
            </p>

            {/* Detay kartları */}
            <div className="mt-6 grid w-full grid-cols-2 gap-3">
              <div className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/15">
                  <VenusAndMars className="h-4 w-4 text-purple-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-zinc-500">{t("profile.field_gender")}</span>
                  <span className="text-xs font-medium text-white">{profile.gender}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15">
                  <Ruler className="h-4 w-4 text-blue-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-zinc-500">{t("profile.field_height")}</span>
                  <span className="text-xs font-medium text-white">{profile.height}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/15">
                  <Weight className="h-4 w-4 text-orange-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-zinc-500">{t("profile.field_weight")}</span>
                  <span className="text-xs font-medium text-white">{profile.weight}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
                  <MapPin className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-zinc-500">{t("profile.field_location")}</span>
                  <span className="text-xs font-medium text-white">{profile.location}</span>
                </div>
              </div>
            </div>

            {/* Düzenle butonu */}
            {saveSuccess && (
              <p className="mb-3 text-center text-xs text-emerald-400">{t("profile.save_success")}</p>
            )}
            <button
              onClick={() => { setForm({ ...profile }); setEditing(true); }}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-purple-500 py-3 text-sm font-medium text-white transition hover:bg-purple-400 active:scale-95"
            >
              <Pencil className="h-4 w-4" />
              {t("profile.edit_button")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Düzenleme modu
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <h2 className="text-sm font-semibold text-white">{t("profile.edit_title")}</h2>
          <button
            onClick={handleCancel}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Düzenleme formu */}
        <div className="flex flex-col gap-4 px-6 py-6">
          {/* Gizli file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                handleChange("avatar", reader.result as string);
              };
              reader.readAsDataURL(file);
            }}
          />

          {/* Profil fotoğrafı - tıklanabilir */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative"
            >
              <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-purple-500/30 to-violet-600/20 blur-xl" />
              <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-purple-400/30 transition group-hover:border-purple-400/60">
                <Image
                  src={form.avatar}
                  alt={form.name}
                  width={96}
                  height={96}
                  className="h-full w-full object-cover"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
                  <Camera className="h-6 w-6 text-white" />
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-purple-400 transition hover:text-purple-300"
            >
              {t("profile.change_photo")}
            </button>
          </div>

          {/* İsim */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{t("profile.name")}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-purple-500/50 focus:bg-purple-500/5"
              placeholder={t("profile.placeholder_name")}
            />
          </div>

          {/* Bio */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{t("profile.bio")}</label>
            <textarea
              value={form.bio}
              onChange={(e) => handleChange("bio", e.target.value)}
              rows={2}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-purple-500/50 focus:bg-purple-500/5"
              placeholder={t("profile.placeholder_bio")}
            />
          </div>

          {/* Cinsiyet */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{t("profile.field_gender")}</label>
            <select
              value={form.gender}
              onChange={(e) => handleChange("gender", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-purple-500/50 focus:bg-purple-500/5"
            >
              <option value={t("profile.gender_male")} className="bg-zinc-900">{t("profile.gender_male")}</option>
              <option value={t("profile.gender_female")} className="bg-zinc-900">{t("profile.gender_female")}</option>
              <option value={t("profile.gender_unspecified")} className="bg-zinc-900">{t("profile.gender_unspecified")}</option>
            </select>
          </div>

          {/* Boy & Kilo - yan yana */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{t("profile.field_height")}</label>
              <input
                type="text"
                value={form.height}
                onChange={(e) => handleChange("height", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-purple-500/50 focus:bg-purple-500/5"
                placeholder={unit === "metric" ? t("profile.placeholder_height_metric") : t("profile.placeholder_height_imperial")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{t("profile.field_weight")}</label>
              <input
                type="text"
                value={form.weight}
                onChange={(e) => handleChange("weight", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-purple-500/50 focus:bg-purple-500/5"
                placeholder={unit === "metric" ? t("profile.placeholder_weight_metric") : t("profile.placeholder_weight_imperial")}

              />
            </div>
          </div>

          {/* Konum */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{t("profile.field_location")}</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => handleChange("location", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-purple-500/50 focus:bg-purple-500/5"
              placeholder={t("profile.placeholder_location")}
            />
          </div>

          {/* Natural / Destekli seçimi */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{t("profile.field_status")}</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleChange("isNatural", true)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition ${
                  form.isNatural
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400"
                    : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20"
                }`}
              >
                <Leaf className="h-4 w-4" />
                {t("profile.natural_badge")}
              </button>
              <button
                type="button"
                onClick={() => handleChange("isNatural", false)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition ${
                  !form.isNatural
                    ? "border-amber-500/50 bg-amber-500/15 text-amber-400"
                    : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20"
                }`}
              >
                <Sparkles className="h-4 w-4" />
                {t("profile.enhanced_badge")}
              </button>
            </div>
          </div>

          {/* Butonlar */}
          {saveError && (
            <p className="text-center text-xs text-red-300">{saveError}</p>
          )}
          <div className="mt-2 flex gap-3">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="flex flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/10 active:scale-95 disabled:opacity-50"
            >
              {t("profile.cancel_button")}
            </button>
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-purple-500 py-3 text-sm font-medium text-white transition hover:bg-purple-400 active:scale-95 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {saving ? t("profile.saving") : t("profile.save_button")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
