import { defineRouteRaw } from "@/lib/api/route-handler";
import { loadAvatarBytesForToken } from "@/lib/services/avatar-media.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/media/avatar — same-origin avatar bytes; UUID never appears in the URL. */
export const GET = defineRouteRaw(
  {
    route: "GET /api/media/avatar",
    auth: "none",
    publicRateLimit: "public_media",
    requireCsrf: false,
  },
  async ({ request }) => {
    const token = new URL(request.url).searchParams.get("t") ?? "";
    const file = await loadAvatarBytesForToken(token);
    if (!file) {
      return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
    }
    return new Response(file.body, {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  },
);
