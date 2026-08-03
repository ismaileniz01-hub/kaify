import { z } from "zod";

export const otpSendSchema = z.object({
  email: z.string().trim().email().max(320),
  recaptchaToken: z.string().min(1).optional(),
});

export const otpVerifySchema = z.object({
  email: z.string().trim().email().max(320),
  token: z.string().trim().min(6).max(6).regex(/^\d{6}$/),
});
