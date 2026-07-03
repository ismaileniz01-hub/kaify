import type { ProfileDTO } from "@/lib/types/domain.types";
import type { UserProfile } from "@/lib/user";
import type { ProfileUpdateInput } from "@/lib/validations/profile.schema";
import { getCountryName } from "@/lib/country-names";

const GENDER_LABEL_TO_VALUE: Record<string, string> = {
  erkek: "male",
  male: "male",
  kadın: "female",
  kadin: "female",
  female: "female",
  other: "other",
  diğer: "other",
  diger: "other",
};

function formatGender(gender: string | null): string {
  if (!gender) return "—";
  switch (gender) {
    case "male":
      return "Erkek";
    case "female":
      return "Kadın";
    case "other":
      return "Diğer";
    case "prefer_not_to_say":
      return "Belirtilmedi";
    default:
      return gender;
  }
}

function parseGenderInput(value: string): ProfileUpdateInput["gender"] {
  const key = value.trim().toLowerCase();
  const mapped = GENDER_LABEL_TO_VALUE[key];
  if (
    mapped === "male" ||
    mapped === "female" ||
    mapped === "other" ||
    mapped === "prefer_not_to_say"
  ) {
    return mapped;
  }
  return "prefer_not_to_say";
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
    gender: formatGender(dto.gender),
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
