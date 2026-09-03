"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { useTRPC } from "@/trpc/client";

/**
 * W15 — the Week altitude of the burn signal (discovery 4.6).
 *
 * Week is the earliest steering read: surfacing burn here means you can still act on
 * it this week — re-scope, raise it with the client, or decide to eat it — rather
 * than meeting it when the invoice is drafted.
 *
 * Display only. The notification half of 4.7 is NOT here: the app already has an
 * edge-triggered notifier (`ThresholdNotifier`) that fires once per crossing, re-arms
 * on recovery, and has a per-type switch. W15 changed what its project alert means;
 * a second notifier on this block would fire a duplicate of it.
 */
export function RunningHotBlock() {
  const trpc = useTRPC();
  const { data: reads = [] } = useQuery(trpc.projects.burn.queryOptions({}));

  const hot = reads.filter((r) => r.burn.total.state === "hot");
  if (hot.length === 0) return null;

  return (
    <section className="flex flex-col gap-2 rounded-card border border-subtle bg-surface p-4 shadow-surface">
      <h3 className="text-caption font-semibold uppercase tracking-wide text-ink-muted">
        Running hot
      </h3>
      <ul className="flex flex-col gap-1.5">
        {hot.map((read) => (
          <li key={read.projectId}>
            <Link
              href={`/projects/${read.projectId}`}
              className="flex flex-col rounded-control px-1 py-0.5 transition hover:bg-surface-2"
            >
              <span className="truncate text-sm text-ink">{read.projectName}</span>
              <span className="text-meta text-ink-faint">{read.message}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
