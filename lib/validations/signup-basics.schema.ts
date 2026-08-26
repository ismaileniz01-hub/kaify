import { z } from "zod";
import { localeSchema } from "@/lib/validations/onboarding.schema";
import { meetsMinimumAge } from "@/lib/compliance/age";

export const signupBasicsSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid birth date")
    .refine(meetsMinimumAge, "You must be at least 16 years old"),
  countryCode: z
    .string()
    .trim()
    .length(2)
    .regex(/^[A-Za-z]{2}$/)
    .transform((value) => value.toUpperCase()),
  locale: localeSchema,
});

export type SignupBasicsInput = z.infer<typeof signupBasicsSchema>;
