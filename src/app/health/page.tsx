import * as Sentry from "@sentry/nextjs";
import Link from "next/link";

import type { RouterOutputs } from "@/trpc/client";
import { getTRPCCaller } from "@/trpc/server";

type HealthChecksList = RouterOutputs["healthChecks"]["list"];
type LatestHealthCheck = RouterOutputs["healthChecks"]["getLatest"];

function statusBadgeClass(status: string): string {
  switch (status) {
    case "ok":
      return "rounded-pill border border-border bg-emerald-100/80 text-emerald-800";
    case "degraded":
      return "rounded-pill border border-border bg-amber-100/80 text-amber-800";
    case "down":
      return "rounded-pill border border-border bg-red-100/80 text-red-800";
    default:
      return "rounded-pill border border-border bg-surface text-ink-muted";
  }
}

function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function HealthPage() {
  const caller = await getTRPCCaller();

  let checks: HealthChecksList = [];
  let latest: LatestHealthCheck | null = null;
  let loadError = false;
  try {
    [checks, latest] = await Promise.all([
      caller.healthChecks.list({ limit: 20 }),
      caller.healthChecks.getLatest({}),
    ]);
  } catch (error) {
    // Degrade gracefully: a DB failure (e.g. pool exhaustion) renders an error
    // notice in the existing chrome instead of white-screening the route.
    Sentry.captureException(error);
    loadError = true;
  }

  return (
    <div className="relative min-h-screen">
      <div className="relative z-sticky mx-auto min-h-screen max-w-3xl px-6 py-12">
        <header className="mb-10 rounded-card border border-subtle bg-surface px-6 py-5 shadow-surface">
          <p className="mb-2 text-sm text-ink-muted">
            <Link
              href="/today"
              className="text-accent underline underline-offset-2 transition hover:text-ink"
            >
              ← Plan
            </Link>
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Health checks</h1>
          <p className="mt-2 text-ink-muted">Latest service status from the database via tRPC.</p>
        </header>

        {loadError && (
          <p
            role="alert"
            className="mb-10 rounded-card border border-critical bg-red-100/60 px-6 py-5 text-red-800 shadow-surface"
          >
            Couldn&apos;t reach the database to load health checks. This usually means the
            connection pool is momentarily exhausted — try again in a moment.
          </p>
        )}

        {latest ? (
          <section className="mb-10 rounded-card border border-subtle bg-surface px-6 py-5 shadow-surface">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-ink-muted">
              Latest check
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-lg font-medium text-ink">{latest.service}</span>
              <span className={`px-3 py-1 text-sm font-medium ${statusBadgeClass(latest.status)}`}>
                {latest.status}
              </span>
              <span className="text-sm text-ink-muted">{formatTimestamp(latest.checkedAt)}</span>
            </div>
          </section>
        ) : (
          <p className="mb-10 rounded-card border border-dashed border-subtle bg-surface px-6 py-5 text-center text-ink-muted shadow-surface">
            No health checks recorded yet.
          </p>
        )}

        <section className="rounded-card border border-subtle bg-surface px-2 py-2 shadow-surface">
          <h2 className="mb-4 px-4 pt-2 text-lg font-medium text-ink">Recent checks</h2>
          {checks.length === 0 ? (
            <p className="px-4 pb-4 text-ink-muted">No rows in health_checks.</p>
          ) : (
            <ul className="divide-y divide-white/40">
              {checks.map((check) => (
                <li
                  key={check.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-ink">{check.service}</span>
                    <span
                      className={`px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(check.status)}`}
                    >
                      {check.status}
                    </span>
                  </div>
                  <time className="text-sm text-ink-muted" dateTime={check.checkedAt.toISOString()}>
                    {formatTimestamp(check.checkedAt)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
