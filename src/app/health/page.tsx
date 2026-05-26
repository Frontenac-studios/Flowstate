import Link from "next/link";

import { GradientBackdrop } from "@/components/kash/GradientBackdrop";
import { getTRPCCaller } from "@/trpc/server";

function statusBadgeClass(status: string): string {
  switch (status) {
    case "ok":
      return "glass-pill bg-emerald-100/80 text-emerald-800";
    case "degraded":
      return "glass-pill bg-amber-100/80 text-amber-800";
    case "down":
      return "glass-pill bg-red-100/80 text-red-800";
    default:
      return "glass-pill text-kash-ink-muted";
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
  const [checks, latest] = await Promise.all([
    caller.healthChecks.list({ limit: 20 }),
    caller.healthChecks.getLatest({}),
  ]);

  return (
    <div className="relative min-h-screen">
      <GradientBackdrop />
      <div className="relative z-10 mx-auto min-h-screen max-w-3xl px-6 py-12">
        <header className="glass-panel mb-10 px-6 py-5">
          <p className="mb-2 text-sm text-kash-ink-muted">
            <Link href="/plan" className="glass-link">
              ← Plan
            </Link>
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-kash-ink">Health checks</h1>
          <p className="mt-2 text-kash-ink-muted">
            Latest service status from the database via tRPC.
          </p>
        </header>

        {latest ? (
          <section className="glass-panel-opaque mb-10 px-6 py-5">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-kash-ink-muted">
              Latest check
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-lg font-medium text-kash-ink">{latest.service}</span>
              <span className={`px-3 py-1 text-sm font-medium ${statusBadgeClass(latest.status)}`}>
                {latest.status}
              </span>
              <span className="text-sm text-kash-ink-muted">
                {formatTimestamp(latest.checkedAt)}
              </span>
            </div>
          </section>
        ) : (
          <p className="glass-panel-opaque mb-10 border border-dashed px-6 py-5 text-center text-kash-ink-muted">
            No health checks recorded yet.
          </p>
        )}

        <section className="glass-panel-opaque px-2 py-2">
          <h2 className="mb-4 px-4 pt-2 text-lg font-medium text-kash-ink">Recent checks</h2>
          {checks.length === 0 ? (
            <p className="px-4 pb-4 text-kash-ink-muted">No rows in health_checks.</p>
          ) : (
            <ul className="divide-y divide-white/40">
              {checks.map((check) => (
                <li
                  key={check.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-kash-ink">{check.service}</span>
                    <span
                      className={`px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(check.status)}`}
                    >
                      {check.status}
                    </span>
                  </div>
                  <time
                    className="text-sm text-kash-ink-muted"
                    dateTime={check.checkedAt.toISOString()}
                  >
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
