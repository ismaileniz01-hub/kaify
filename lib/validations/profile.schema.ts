import { z } from "zod";
import {
  EXPERIENCE_LEVELS,
  GENDERS,
  localeSchema,
} from "@/lib/validations/onboarding.schema";

/**
 * PATCH /api/profile body schema.
 *
 * SECURITY: `.strict()` rejects any unknown keys, so protected columns such as
 * `tier`, `onboarding_status`, `referral_code`, and `team_chat_unlocked` can
 * never be submitted from the client. The SQL `protect_profile_columns` trigger
 * is the database-level backstop for the same guarantee.
 */
export const profileUpdateSchema = z
  .object({
    displayName: z.string().trim().min(1, "Name is required").max(80, "Name too long"),
    avatarUrl: z.string().trim().url("Invalid avatar URL").max(500).nullable(),
    gender: z.enum(GENDERS),
    heightCm: z.number().int().min(50).max(280),
    weightKg: z.number().min(20).max(500),
    experienceLevel: z.enum(EXPERIENCE_LEVELS),
    isNatural: z.boolean(),
    bio: z.string().trim().max(1000, "Bio too long"),
    countryCode: z
      .string()
      .trim()
      .length(2, "Country code must be 2 letters")
      .regex(/^[A-Za-z]{2}$/, "Invalid country code")
      .transform((value) => value.toUpperCase()),
    locale: localeSchema,
  })
  .partial()
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided",
  );

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
