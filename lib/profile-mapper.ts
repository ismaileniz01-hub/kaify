import type { ProfileDTO } from "@/lib/types/domain.types";
import type { UserProfile } from "@/lib/user";
import type { ProfileUpdateInput } from "@/lib/validations/profile.schema";
import { getCountryName } from "@/lib/country-names";

export type ProfileGenderValue =
  | "male"
  | "female"
  | "other"
  | "prefer_not_to_say";

const GENDER_LABEL_TO_VALUE: Record<string, ProfileGenderValue> = {
  male: "male",
  female: "female",
  other: "other",
  prefer_not_to_say: "prefer_not_to_say",
  // Legacy TR labels still accepted when reading old client state
  erkek: "male",
  kadın: "female",
  kadin: "female",
  diğer: "other",
  diger: "other",
  belirtilmedi: "prefer_not_to_say",
};

/** Normalize any stored gender string to a schema value. */
export function parseGenderInput(value: string): ProfileGenderValue {
  const key = value.trim().toLowerCase();
  return GENDER_LABEL_TO_VALUE[key] ?? "prefer_not_to_say";
}

export function genderLabelKey(gender: string | null | undefined): string {
  switch (parseGenderInput(gender ?? "")) {
    case "male":
      return "profile.gender_male";
    case "female":
      return "profile.gender_female";
    case "prefer_not_to_say":
      return "profile.gender_unspecified";
    default:
      return "profile.gender_unspecified";
  }
}

function parseHeightCm(raw: string): number | undefined {
  const match = raw.match(/(\d+)/);
  if (!match) return undefined;
  const n = Number.parseInt(match[1], 10);
  return Number.isFinite(n) ? n : undefined;
}

function parseWeightKg(raw: string): number | undefined {
  const match = raw.match(/([\d.]+)/);
  if (!match) return undefined;
  const n = Number.parseFloat(match[1]);
  return Number.isFinite(n) ? n : undefined;
}

export function profileDtoToUserProfile(dto: ProfileDTO): UserProfile {
  const country = getCountryName(dto.countryCode);
  const location = dto.cityName ? `${dto.cityName}, ${country}` : country;
  return {
    name: dto.displayName || "User",
    avatar: dto.avatarUrl ?? "/kaify-logo.png",
    isNatural: dto.isNatural,
    // Canonical enum — UI localizes via genderLabelKey / t()
    gender: dto.gender ? parseGenderInput(dto.gender) : "prefer_not_to_say",
    height: dto.heightCm ? `${dto.heightCm} cm` : "—",
    weight: dto.weightKg ? `${dto.weightKg} kg` : "—",
    location,
    bio: dto.bio ?? "",
  };
}

export function userProfileToUpdateInput(
  form: UserProfile,
  existing: ProfileDTO,
): ProfileUpdateInput {
  const heightCm = parseHeightCm(form.height) ?? existing.heightCm ?? undefined;
  const weightKg = parseWeightKg(form.weight) ?? existing.weightKg ?? undefined;

  return {
    displayName: form.name.trim(),
    bio: form.bio.trim(),
    isNatural: form.isNatural,
    gender: parseGenderInput(form.gender),
    ...(heightCm !== undefined ? { heightCm } : {}),
    ...(weightKg !== undefined ? { weightKg } : {}),
    ...(form.avatar.startsWith("http") ? { avatarUrl: form.avatar } : {}),
    ...(form.location.includes(",")
      ? { cityName: form.location.split(",")[0].trim() }
      : {}),
  };
}
