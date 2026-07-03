import * as Sentry from "@sentry/nextjs";
import { sentryClientOptions } from "@/lib/sentry/options";

Sentry.init(sentryClientOptions);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
