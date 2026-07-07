import { defineRoute } from "@/lib/api/route-handler";
import { cachedWithStale } from "@/lib/cache";
import { CacheKeys, CacheTTL } from "@/lib/cache/keys";
import { resolveLocale } from "@/lib/i18n/dictionary";
import { getHomeData } from "@/lib/services/home.service";

export const dynamic = "force-dynamic";

/** GET /api/home — welcome screen bundle (motivation, tip, stats). */
export const GET = defineRoute(
  {
    route: "GET /api/home",
    rateLimit: "checkin",
    requireAi: true,
    dailyAiBudget: true,
  },
  async ({ user, request }) => {
    const localeParam = new URL(request.url).searchParams.get("locale");
    const locale = localeParam ? resolveLocale(localeParam) : null;
    return cachedWithStale(
      CacheKeys.homeBundle(user.id, undefined, locale ?? "profile"),
      CacheTTL.homeBundle,
      CacheTTL.homeBundleStale,
      () => getHomeData(user.id, locale),
    );
  },
);
