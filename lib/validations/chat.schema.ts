import { z } from "zod";

/** Coach route param. */
export const coachIdSchema = z.enum(["alex", "maya", "leo", "kai"]);
export type CoachIdInput = z.infer<typeof coachIdSchema>;

/** Coaches with vision-based photo analysis. */
export const visionCoachIdSchema = z.enum(["maya", "leo"]);
export type VisionCoachId = z.infer<typeof visionCoachIdSchema>;

export const sendMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(4000, "Message is too long"),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(30),
  before: z.string().datetime().optional(),
});

export type HistoryQueryInput = z.infer<typeof historyQuerySchema>;
