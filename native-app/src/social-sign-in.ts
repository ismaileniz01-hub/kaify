import { Browser } from "@capacitor/browser";
import { NATIVE_URL_SCHEME } from "@/lib/app-url";
import { NATIVE_CLIENT_VERSION } from "./client-version";
import { nativeCodeVerifierKey, supabase } from "./session";

export type NativeSocialProvider = "google" | "apple";

/** Start Google or Apple. The app receives kaify://login?code= and then sends OTP. */
export async function beginNativeSocialSignIn(
  provider: NativeSocialProvider,
): Promise<void> {
  const redirectTo = `${NATIVE_URL_SCHEME}://login`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: provider === "google" ? { prompt: "select_account" } : undefined,
    },
  });
  if (error || !data.url) {
    throw new Error(error?.message || "Social sign-in failed.");
  }
  await Browser.open({ url: data.url });
}

function readCodeVerifier(): string | null {
  try {
    const raw = localStorage.getItem(nativeCodeVerifierKey()) ?? "";
    const verifier = raw.split("/")[0]?.trim() ?? "";
    return verifier.length >= 20 ? verifier : null;
  } catch {
    return null;
  }
}

function clearCodeVerifier(): void {
  try {
    localStorage.removeItem(nativeCodeVerifierKey());
  } catch {
    // The verifier is single-use. A storage miss still leaves sign-in on the email step.
  }
}

/** Read the provider email from a return URL. Does not keep that session. */
export async function emailFromSocialReturn(raw: string): Promise<string | null> {
  let url: URL;
  try {
    url = new URL(raw.replace(`${NATIVE_URL_SCHEME}://`, "https://kaify.local/"));
  } catch {
    return null;
  }
  const direct = url.searchParams.get("email")?.trim().toLowerCase();
  if (direct?.includes("@")) return direct;

  const code = url.searchParams.get("code");
  if (!code) return null;
  const codeVerifier = readCodeVerifier();
  clearCodeVerifier();
  if (!codeVerifier) return null;

  const response = await fetch(`${__KAIFY_API_BASE__}/api/auth/oauth/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Client-Version": NATIVE_CLIENT_VERSION,
    },
    body: JSON.stringify({ code, codeVerifier }),
  });
  const payload = (await response.json().catch(() => null)) as {
    success?: boolean;
    data?: { email?: string };
  } | null;
  const email = payload?.data?.email?.trim().toLowerCase() ?? "";
  return response.ok && email.includes("@") ? email : null;
}
