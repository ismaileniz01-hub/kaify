// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { sentryEdgeOptions } from "@/lib/sentry/options";

Sentry.init(sentryEdgeOptions);
