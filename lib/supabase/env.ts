import { z } from "zod";

const PLACEHOLDER_PATTERNS = ["your_", "_here", "changeme", "replace_me"] as const;

function isPlaceholderValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) {
    return true;
  }
  return PLACEHOLDER_PATTERNS.some((pattern) => normalized.includes(pattern));
}

const supabaseUrlSchema = z
  .string()
  .trim()
  .min(1, "NEXT_PUBLIC_SUPABASE_URL is required")
  .url("NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS URL")
  .refine(
    (value) => value.startsWith("https://"),
    "NEXT_PUBLIC_SUPABASE_URL must use HTTPS",
  )
  .refine(
    (value) => !isPlaceholderValue(value),
    "NEXT_PUBLIC_SUPABASE_URL is still set to a placeholder value",
  );

const supabaseAnonKeySchema = z
  .string()
  .trim()
  .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required")
  .refine(
    (value) => !isPlaceholderValue(value),
    "NEXT_PUBLIC_SUPABASE_ANON_KEY is still set to a placeholder value",
  );

const supabaseServiceRoleKeySchema = z
  .string()
  .trim()
  .min(1, "SUPABASE_SERVICE_ROLE_KEY is required")
  .refine(
    (value) => !isPlaceholderValue(value),
    "SUPABASE_SERVICE_ROLE_KEY is still set to a placeholder value",
  );

export const supabasePublicEnvSchema = z.object({
  url: supabaseUrlSchema,
  anonKey: supabaseAnonKeySchema,
});

export const supabaseServerEnvSchema = supabasePublicEnvSchema.extend({
  serviceRoleKey: supabaseServiceRoleKeySchema,
});

export type SupabasePublicEnv = z.infer<typeof supabasePublicEnvSchema>;
export type SupabaseServerEnv = z.infer<typeof supabaseServerEnvSchema>;

export class SupabaseEnvError extends Error {
  readonly code = "SUPABASE_ENV_INVALID";

  constructor(message: string) {
    super(message);
    this.name = "SupabaseEnvError";
  }
}

function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join("; ");
}

export function getSupabasePublicEnv(): SupabasePublicEnv {
  const candidate = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  };

  const parsed = supabasePublicEnvSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new SupabaseEnvError(formatZodError(parsed.error));
  }

  return parsed.data;
}

export function getSupabaseServerEnv(): SupabaseServerEnv {
  const candidate = {
    ...getSupabasePublicEnv(),
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  };

  const parsed = supabaseServerEnvSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new SupabaseEnvError(formatZodError(parsed.error));
  }

  return parsed.data;
}

export function assertServerRuntime(caller: string): void {
  if (typeof window !== "undefined") {
    throw new SupabaseEnvError(
      `${caller} must only be invoked on the server. Service credentials must never run in the browser.`,
    );
  }
}
