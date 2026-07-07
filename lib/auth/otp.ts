/** Must match Supabase Auth → Providers → Email → Email OTP length (6). */
export const OTP_LENGTH = 6;

export function normalizeOtpInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, OTP_LENGTH);
}

export function isCompleteOtp(value: string): boolean {
  return normalizeOtpInput(value).length === OTP_LENGTH;
}
