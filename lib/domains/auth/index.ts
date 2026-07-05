/** Auth & session domain — guards, MFA, CSRF. */
export { requireUser, type AuthedUser } from "@/lib/api/auth-guard";
export { requireAdmin } from "@/lib/api/admin-guard";
export { requireSensitiveActionAuth } from "@/lib/auth/mfa-server";
export { assertCsrf } from "@/lib/security/csrf";
