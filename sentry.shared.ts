import type { BrowserOptions, EdgeOptions, NodeOptions } from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

/** Shared Sentry options (wizard: tracing + logs on, replay off, tunnel off). */
export const sentrySharedOptions = {
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1 : 0.1,
  enableLogs: true,
  sendDefaultPii: true,
  // Next.js uses thrown exceptions for control flow: notFound() throws
  // NEXT_NOT_FOUND and redirect() throws NEXT_REDIRECT. These are expected
  // route behaviour, not errors — drop them so they don't drown real issues.
  ignoreErrors: ["NEXT_NOT_FOUND", "NEXT_REDIRECT"],
} satisfies Partial<BrowserOptions & NodeOptions & EdgeOptions>;
