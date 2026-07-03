// This file configures the initialization of Sentry on the server.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { sentryServerOptions } from "@/lib/sentry/options";

Sentry.init(sentryServerOptions);
