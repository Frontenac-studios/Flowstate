import Link from "next/link";

import { getTRPCCaller } from "@/trpc/server";

function statusBadgeClass(status: string): string {
  switch (status) {
    case "ok":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
    case "degraded":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200";
    case "down":
      return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200";
    default:
      return "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200";
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
    <div className="mx-auto min-h-screen max-w-3xl px-6 py-12 font-[family-name:var(--font-geist-sans)]">
      <header className="mb-10">
        <p className="mb-2 text-sm text-zinc-500">
          <Link href="/" className="hover:underline">
            ← Home
          </Link>
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Health checks</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Latest service status from the database via tRPC.
        </p>
      </header>

      {latest ? (
        <section className="mb-10 rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
            Latest check
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-lg font-medium">{latest.service}</span>
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${statusBadgeClass(latest.status)}`}
            >
              {latest.status}
            </span>
            <span className="text-sm text-zinc-500">{formatTimestamp(latest.checkedAt)}</span>
          </div>
        </section>
      ) : (
        <p className="mb-10 rounded-xl border border-dashed border-zinc-300 p-6 text-zinc-500 dark:border-zinc-700">
          No health checks recorded yet.
        </p>
      )}

      <section>
        <h2 className="mb-4 text-lg font-medium">Recent checks</h2>
        {checks.length === 0 ? (
          <p className="text-zinc-500">No rows in health_checks.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {checks.map((check) => (
              <li
                key={check.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium">{check.service}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(check.status)}`}
                  >
                    {check.status}
                  </span>
                </div>
                <time className="text-sm text-zinc-500" dateTime={check.checkedAt.toISOString()}>
                  {formatTimestamp(check.checkedAt)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
