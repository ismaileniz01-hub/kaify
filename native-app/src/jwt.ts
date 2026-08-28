export function decodeJwtPayload(
  token: string,
): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2 || !parts[1]) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "=");
    const json = atob(padded);
    const payload = JSON.parse(json) as Record<string, unknown>;
    return payload && typeof payload === "object" ? payload : null;
  } catch {
    return null;
  }
}

export function userFromAccessToken(accessToken: string): {
  id: string;
  aud: string;
  role: string;
  email?: string;
  phone: string;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
  identities: unknown[];
  created_at: string;
  updated_at: string;
} | null {
  const payload = decodeJwtPayload(accessToken);
  if (!payload || typeof payload.sub !== "string" || !payload.sub) return null;
  const now = new Date().toISOString();
  return {
    id: payload.sub,
    aud: typeof payload.aud === "string" ? payload.aud : "authenticated",
    role: typeof payload.role === "string" ? payload.role : "authenticated",
    email: typeof payload.email === "string" ? payload.email : undefined,
    phone: typeof payload.phone === "string" ? payload.phone : "",
    app_metadata:
      payload.app_metadata && typeof payload.app_metadata === "object"
        ? (payload.app_metadata as Record<string, unknown>)
        : {},
    user_metadata:
      payload.user_metadata && typeof payload.user_metadata === "object"
        ? (payload.user_metadata as Record<string, unknown>)
        : {},
    identities: [],
    created_at: now,
    updated_at: now,
  };
}
