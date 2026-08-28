import { supabase } from "./session";
import { NATIVE_CLIENT_VERSION } from "./client-version";
import {
  CONSENT_TYPES,
  PRIVACY_VERSION,
  TERMS_VERSION,
} from "@/lib/legal/constants";

export type NativeProfile = {
  id: string;
  tier?: string | null;
  tierStartedAt?: string | null;
  tierExpiresAt?: string | null;
  onboardingStatus?: string;
};

async function accessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error("Your session expired. Please sign in again.");
  }
  return data.session.access_token;
}

export async function nativeApi(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${await accessToken()}`);
  headers.set("X-Client-Version", NATIVE_CLIENT_VERSION);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${__KAIFY_API_BASE__}${path}`, {
    ...init,
    headers,
  });
  if (response.status === 401) {
    await supabase.auth.refreshSession();
  }
  return response;
}

export function profileHasPaidAccess(
  profile: NativeProfile | null,
  now = Date.now(),
): boolean {
  if (!profile?.tier || !profile.tierStartedAt) return false;
  if (!profile.tierExpiresAt) return true;
  const expiresAt = Date.parse(profile.tierExpiresAt);
  return Number.isFinite(expiresAt) && expiresAt > now;
}

export async function loadProfile(): Promise<NativeProfile | null> {
  const response = await nativeApi("/api/v1/profile");
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Could not load your account.");
  const body = (await response.json()) as {
    data?: NativeProfile | { profile?: NativeProfile };
  };
  if (body.data && "profile" in body.data) return body.data.profile ?? null;
  return (body.data as NativeProfile | undefined) ?? null;
}

export async function recordNativeSignupConsents(): Promise<void> {
  for (const consentType of [
    CONSENT_TYPES.TERMS_PRIVACY,
    CONSENT_TYPES.AI_HEALTH,
  ]) {
    const response = await nativeApi("/api/v1/consent", {
      method: "POST",
      headers: { "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({
        consentType,
        metadata: {
          source: "native_signup",
          termsVersion: TERMS_VERSION,
          privacyVersion: PRIVACY_VERSION,
        },
      }),
    });
    if (!response.ok) {
      throw new Error("Your consent choices could not be saved.");
    }
  }
}

export async function sendKaiMessage(message: string): Promise<string> {
  const response = await nativeApi("/api/v1/chat/kai", {
    method: "POST",
    headers: {
      Accept: "text/event-stream",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({ message, locale: "en" }),
  });
  if (response.status === 403) {
    throw new Error("An active subscription is required before coaching.");
  }
  if (!response.ok) throw new Error("Kai is unavailable. Please try again.");

  const text = await response.text();
  let completed = "";
  let streamed = "";
  for (const block of text.split("\n\n")) {
    const event = block.match(/^event:\s*(.+)$/m)?.[1];
    const dataLine = block.match(/^data:\s*(.+)$/m)?.[1];
    if (!dataLine) continue;
    try {
      const data = JSON.parse(dataLine) as { content?: string };
      if (event === "delta") streamed += data.content ?? "";
      if (event === "done") completed = data.content ?? streamed;
      if (event === "error") throw new Error(data.content || "Chat failed.");
    } catch (error) {
      if (error instanceof SyntaxError) continue;
      throw error;
    }
  }
  return completed || streamed || "Kai replied, but the response was empty.";
}
