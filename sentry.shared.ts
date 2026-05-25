import type { BrowserOptions, EdgeOptions, NodeOptions } from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

/** Shared Sentry options (wizard: tracing + logs on, replay off, tunnel off). */
export const sentrySharedOptions = {
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1 : 0.1,
  enableLogs: true,
  sendDefaultPii: true,
} satisfies Partial<BrowserOptions & NodeOptions & EdgeOptions>;
