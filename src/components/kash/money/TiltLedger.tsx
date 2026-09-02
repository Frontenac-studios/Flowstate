"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ChevronLeft, ChevronRight } from "@/components/kash/ui/icon";
import type { LedgerGroup } from "@/lib/ledger/compute-ledger";
import { formatPeriodLabel, periodForKey, shiftPeriod } from "@/lib/ledger/fortnight";
import { ledgerCopy } from "@/lib/ledger/ledger-copy";
import { readLastSeenPeriodKey, writeLastSeenPeriodKey } from "@/lib/ledger/ledger-storage";
import { categorySolidVar } from "@/lib/projects/category-tokens";
import { useTRPC } from "@/trpc/client";

/**
 * W8 — the Ledger. Every second Friday a fortnight closes; this is the honest read
 * of it: the tilt you declared against the time you actually logged, and where that
 * time went by client and project.
 *
 * Named TiltLedger, not Ledger, because the Draw panel on this same surface already
 * calls its running cash total a ledger. This one measures hours, not money.
 *
 * It waits to be opened (law 3). Nothing here notifies, badges the nav, or turns
 * red — a closed fortnight is announced only by a line of text on a surface you
 * chose to visit, and that marker clears once you have seen it.
 */
export default function TiltLedger() {
  const trpc = useTRPC();
  const tzOffsetMinutes = useMemo(() => -new Date().getTimezoneOffset(), []);

  const { data: bounds } = useQuery(trpc.ledger.bounds.queryOptions({ tzOffsetMinutes }));

  // Null = "the most recently closed fortnight", resolved server-side.
  const [periodKey, setPeriodKey] = useState<string | null>(null);
  const { data, isLoading } = useQuery(
    trpc.ledger.forPeriod.queryOptions({
      ...(periodKey ? { periodKey } : {}),
      tzOffsetMinutes,
    })
  );

  // Freeze any fortnight that has closed since the last visit. Opening Money is the
  // trigger; there is no cron, and law 3 would not permit one.
  const seal = useMutation(trpc.ledger.seal.mutationOptions());
  const sealReady = bounds?.hasEntries === true;
  useEffect(() => {
    if (!sealReady) return;
    seal.mutate({ tzOffsetMinutes });
    // Once per mount: sealing is idempotent, but re-running it on every render
    // would be a write loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sealReady, tzOffsetMinutes]);

  // Snapshot what had been seen before this visit, then record the current one.
  const [seenBefore] = useState(() => readLastSeenPeriodKey());
  const latestClosedKey = bounds?.latestClosedKey ?? null;
  useEffect(() => {
    if (latestClosedKey) writeLastSeenPeriodKey(latestClosedKey);
  }, [latestClosedKey]);

  const period = data?.period ?? null;
  const ledger = data?.ledger ?? null;

  const isNewlyClosed =
    latestClosedKey !== null && seenBefore !== latestClosedKey && period?.key === latestClosedKey;

  const step = (by: number) => {
    const current = period ? periodForKey(period.key, tzOffsetMinutes) : null;
    if (!current) return;
    setPeriodKey(shiftPeriod(current, by, tzOffsetMinutes).key);
  };

  const atNewest = !!(period && bounds && period.key === bounds.latestClosedKey);
  const atOldest = !!(period && bounds && period.key === bounds.earliestKey);

  return (
    <section
      aria-labelledby="ledger-heading"
      className="rounded-card border border-border bg-surface p-5 shadow-surface"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex items-baseline gap-2">
          <h2 id="ledger-heading" className="text-body font-medium text-ink">
            The Ledger
          </h2>
          {isNewlyClosed ? <span className="text-caption text-ink-muted">· new</span> : null}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-caption tabular-nums text-ink-muted">
            {period ? formatPeriodLabel(periodForKey(period.key, tzOffsetMinutes)!) : "—"}
          </span>
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={atOldest || !period}
            aria-label="Earlier fortnight"
            className="rounded p-1 text-ink-muted transition hover:bg-surface-2 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={atNewest || !period}
            aria-label="Later fortnight"
            className="rounded p-1 text-ink-muted transition hover:bg-surface-2 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </header>

      {isLoading || !ledger || !period ? (
        <p className="mt-3 text-caption text-ink-faint">
          {isLoading ? "Reading the fortnight…" : "No fortnight to show yet."}
        </p>
      ) : (
        <LedgerBody ledger={ledger} period={period} source={data?.source ?? "live"} />
      )}
    </section>
  );
}

function LedgerBody({
  ledger,
  period,
  source,
}: {
  ledger: {
    bar: Parameters<typeof ledgerCopy>[0]["bar"];
    totalSeconds: number;
    groups: LedgerGroup[];
  };
  period: { isCurrentQuarter: boolean; quarterLabel: string };
  source: "sealed" | "live";
}) {
  const copy = ledgerCopy({
    bar: ledger.bar,
    isCurrentQuarter: period.isCurrentQuarter,
    source,
    quarterLabel: period.quarterLabel,
  });

  return (
    <>
      <p className="mt-3 text-body text-ink">{copy.headline}</p>
      {copy.note ? <p className="mt-1 text-caption text-ink-faint">{copy.note}</p> : null}

      {ledger.bar.state === "unset" ? (
        // A link, never an inline control: a review arrives answered, and a form
        // embedded in a retrospective is the blank page (§8b).
        <p className="mt-1 text-caption text-ink-faint">
          <Link href="/today" className="underline underline-offset-2 hover:text-ink-muted">
            Declare a tilt on Today
          </Link>{" "}
          and the next fortnight reads against it.
        </p>
      ) : null}

      {ledger.totalSeconds > 0 ? (
        <>
          <SplitBar bar={ledger.bar} />
          <ul className="mt-4 flex flex-col gap-3">
            {ledger.groups.map((group) => (
              <li key={`${group.kind}:${group.clientId ?? group.name}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-body text-ink">{group.name}</span>
                  <span className="shrink-0 text-caption tabular-nums text-ink-muted">
                    {hoursLabel(group.seconds)} · {group.sharePct}%
                  </span>
                </div>
                <ul className="mt-1 flex flex-col gap-0.5 pl-3">
                  {group.projects.map((project) => (
                    <li
                      key={project.projectId}
                      className="flex items-baseline justify-between gap-3"
                    >
                      <span className="truncate text-caption text-ink-muted">{project.name}</span>
                      <span className="shrink-0 text-caption tabular-nums text-ink-faint">
                        {hoursLabel(project.seconds)}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}

/** The fortnight's split, with the declared tilt as a quiet marker — never an alarm. */
function SplitBar({ bar }: { bar: Parameters<typeof ledgerCopy>[0]["bar"] }) {
  return (
    <div
      className="bg-surface-muted relative mt-3 flex h-2 overflow-hidden rounded-full"
      role="img"
      aria-label={
        bar.tiltBusinessPct !== null
          ? `${bar.actualBusinessPct}% business over the fortnight, declared ${bar.tiltBusinessPct}%`
          : `${bar.actualBusinessPct}% business over the fortnight`
      }
    >
      <span
        style={{ flexGrow: bar.businessSeconds, backgroundColor: categorySolidVar("business") }}
      />
      <span
        style={{ flexGrow: bar.personalSeconds, backgroundColor: categorySolidVar("personal") }}
      />
      {bar.tiltBusinessPct !== null ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-px bg-ink"
          style={{ left: `${bar.tiltBusinessPct}%`, opacity: 0.55 }}
        />
      ) : null}
    </div>
  );
}

function hoursLabel(seconds: number): string {
  return `${(seconds / 3600).toFixed(1)}h`;
}
