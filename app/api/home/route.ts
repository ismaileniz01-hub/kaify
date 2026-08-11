import { defineRoute } from "@/lib/api/route-handler";
import { cachedWithStale } from "@/lib/cache";
import { CacheKeys, CacheTTL } from "@/lib/cache/keys";
import { resolveLocale } from "@/lib/i18n/dictionary";
import {
  getHomeCoreData,
  localizeHomeData,
} from "@/lib/services/home.service";

export const dynamic = "force-dynamic";

/** GET /api/home — welcome screen bundle (motivation, tip, stats). */
export const GET = defineRoute(
  {
    route: "GET /api/home",
    rateLimit: "session",
    requireAi: true,
    dailyAiBudget: true,
  },
  async ({ user, request }) => {
    const localeParam = new URL(request.url).searchParams.get("locale");
    const locale = localeParam ? resolveLocale(localeParam) : null;
    const core = await cachedWithStale(
      CacheKeys.homeBundle(user.id),
      CacheTTL.homeBundle,
      CacheTTL.homeBundleStale,
      () => getHomeCoreData(user.id),
    );
    return localizeHomeData(core, locale);
  },
);
