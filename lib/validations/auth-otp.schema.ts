import { z } from "zod";

export const otpSendSchema = z.object({
  email: z.string().trim().email().max(320),
  /** Web reCAPTCHA v2 Invisible token (siteverify). */
  recaptchaToken: z.string().min(1).optional(),
  /**
   * Native iOS reCAPTCHA Enterprise mobile SDK token.
   * Validated via Enterprise assessment — never via web siteverify.
   */
  recaptchaEnterpriseToken: z.string().min(20).optional(),
  /** Declares native platform for Enterprise path (`ios` only for now). */
  recaptchaPlatform: z.enum(["ios"]).optional(),
  locale: z.enum(["tr", "en"]).default("en"),
});

export const otpVerifySchema = z.object({
  email: z.string().trim().email().max(320),
  token: z.string().trim().min(6).max(6).regex(/^\d{6}$/),
  recaptchaEnterpriseToken: z.string().min(20).optional(),
  recaptchaPlatform: z.enum(["ios"]).optional(),
});

export const passwordLoginSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
  recaptchaToken: z.string().min(1).optional(),
});
