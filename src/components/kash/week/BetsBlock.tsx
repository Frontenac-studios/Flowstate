"use client";

import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@/trpc/client";

type Bet = RouterOutputs["targets"]["betsForWeek"][number];

function evidenceLine(bet: Bet): string {
  if (!bet.movedThisWeek) return "Quiet this week";
  if (bet.weeklyValue == null) return "Updated this week";
  switch (bet.measureKind) {
    case "currency":
      return `$${Math.round(bet.weeklyValue / 100).toLocaleString()} booked this week`;
    case "shipped":
      return `${bet.weeklyValue} shipped this week`;
    default:
      return `+${bet.weeklyValue} this week`;
  }
}

/**
 * W14 — "The bets" block (goal 3). The cap-3 active Targets (W5), each a thin
 * progress bar over a "shipped this week" evidence line. A bet that moved nothing
 * this week says so in muted grey — never crimson.
 */
export function BetsBlock() {
  const trpc = useTRPC();
  const tzOffsetMinutes = -new Date().getTimezoneOffset();
  const { data: bets = [] } = useQuery(trpc.targets.betsForWeek.queryOptions({ tzOffsetMinutes }));

  return (
    <section className="flex flex-col gap-2 rounded-card border border-subtle bg-surface p-4 shadow-surface">
      <h3 className="text-caption font-semibold uppercase tracking-wide text-ink-muted">
        The bets
      </h3>
      {bets.length === 0 ? (
        <p className="text-meta text-ink-faint">No active bets this quarter.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {bets.map((bet) => (
            <li key={bet.id} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate text-sm text-ink">{bet.title}</span>
                {bet.isMet ? <span className="shrink-0 text-caption text-accent">met</span> : null}
              </div>
              <div className="bg-surface-muted h-1.5 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full bg-ink"
                  style={{ width: `${Math.round(bet.progress * 100)}%` }}
                />
              </div>
              <span
                className={`text-meta ${bet.movedThisWeek ? "text-ink-muted" : "text-ink-faint"}`}
              >
                {evidenceLine(bet)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
