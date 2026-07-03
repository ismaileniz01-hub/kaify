import { z } from "zod";

/** Referral codes are uppercase alphanumeric, min 6 chars (see profiles check). */
export const referralCodeSchema = z
  .string()
  .trim()
  .min(6, "Referral code too short")
  .max(20, "Referral code too long")
  .regex(/^[A-Za-z0-9]+$/, "Invalid referral code")
  .transform((value) => value.toUpperCase());

export const trackReferralSchema = z.object({
  code: referralCodeSchema,
});

export type TrackReferralInput = z.infer<typeof trackReferralSchema>;
