import { LoginPageContent } from "../login-page-content";
import { parseAuthMode, sanitizeAuthRedirect } from "@/lib/auth/safe-redirect";

/**
 * Server page: read query on the server so Android WebView never stalls on
 * a client Suspense fallback ("Loading secure sign-in…").
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; next?: string }>;
}) {
  const params = await searchParams;
  return (
    <LoginPageContent
      mode={parseAuthMode(params.mode)}
      redirectTo={sanitizeAuthRedirect(params.next)}
    />
  );
}
