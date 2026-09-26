import { z } from "zod";

export const otpSendSchema = z.object({
  email: z.string().trim().email().max(320),
  recaptchaToken: z.string().min(1).optional(),
  locale: z.enum(["tr", "en"]).default("en"),
});

export const otpVerifySchema = z.object({
  email: z.string().trim().email().max(320),
  token: z.string().trim().min(6).max(6).regex(/^\d{6}$/),
});

export const nativeSessionEstablishSchema = z.object({
  accessToken: z.string().trim().min(20).max(8192),
  refreshToken: z.string().trim().min(10).max(4096),
});

export const nativeSessionRefreshSchema = z
  .object({
    refreshToken: z.string().trim().min(10).max(4096).optional(),
    refresh_token: z.string().trim().min(10).max(4096).optional(),
  })
  .refine(
    (value) => Boolean(value.refreshToken || value.refresh_token),
    { message: "refreshToken is required." },
  );

export const passwordLoginSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
  recaptchaToken: z.string().min(1).optional(),
});
