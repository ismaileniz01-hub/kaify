import { getServerAuthUser } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/errors";

export type AuthedUser = {
  id: string;
  email: string | undefined;
};

/**
 * Resolves the authenticated user for the current request.
 * Throws ApiError(401) when there is no valid session.
 */
export async function requireUser(): Promise<AuthedUser> {
  const user = await getServerAuthUser();

  if (!user) {
    throw new ApiError("UNAUTHORIZED", "Bu işlem için giriş yapmalısınız.");
  }

  return user;
}
