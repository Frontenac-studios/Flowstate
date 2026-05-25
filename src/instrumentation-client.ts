import * as Sentry from "@sentry/nextjs";

import { sentrySharedOptions } from "../sentry.shared";

Sentry.init(sentrySharedOptions);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
