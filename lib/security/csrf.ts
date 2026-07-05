import { cookies } from "next/headers";
import { type NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  verifyCsrfPair,
} from "@/lib/security/csrf-crypto";

export {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  attachCsrfCookie,
  csrfCookieOptions,
  mintCsrfToken,
} from "@/lib/security/csrf-crypto";

/** Validates header token matches cookie (mutating / sensitive routes). */
export async function assertCsrf(request: NextRequest): Promise<void> {
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!(await verifyCsrfPair(cookieToken ?? "", headerToken ?? ""))) {
    throw new ApiError("FORBIDDEN", "CSRF doğrulaması başarısız.");
  }
}

/** Server component / route helper for reading cookie store. */
export async function getServerCsrfToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(CSRF_COOKIE_NAME)?.value ?? null;
}
