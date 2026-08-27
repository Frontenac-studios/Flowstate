"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { ArrowRight } from "@/components/kash/ui/icon";
import { quarterLabel, quarterOf } from "@/lib/quarter/quarter-period";
import { useTRPC } from "@/trpc/client";

/** Whole-dollar cents → "$642". */
function dollars(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

/**
 * "Reviewed here · owned elsewhere" strips (W5f, discovery §5). Quarter shows a
 * quarter-horizon read of things it does not own and drills to their home.
 *
 * - Tool spend reads Money's business expenses; conditional — absent when there's
 *   nothing this or last quarter.
 * - Compliance-this-quarter reads the business tickler's dated obligations. The
 *   tickler isn't built yet, so that strip has no source and stays absent; it
 *   lights up automatically when the tickler lands (a `tickler.thisQuarter` read
 *   slotted in below).
 *
 * Renders nothing at all when no strip has anything to show, so the section
 * header can be hidden by the caller.
 */
export default function ReadStrips() {
  const trpc = useTRPC();
  const { data: spend } = useQuery(trpc.money.toolSpendSummary.queryOptions());

  const hasSpend = spend != null && (spend.thisQuarterCents > 0 || spend.priorQuarterCents > 0);
  if (!hasSpend) return null;

  const priorLabel = quarterLabel(quarterOf(new Date(quarterOf(new Date()).start.getTime() - 1)));
  const delta = spend.deltaCents;
  const arrow = delta > 0 ? "▲" : delta < 0 ? "▼" : "•";

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-caption font-semibold uppercase tracking-wide text-ink-muted">
        Reviewed here · owned elsewhere
      </h2>
      <Link
        href="/money"
        className="flex items-center justify-between gap-4 rounded-card border border-subtle bg-surface p-4 shadow-surface transition hover:bg-surface-2"
      >
        <div className="min-w-0">
          <p className="text-body text-ink">Tool spend</p>
          <p className="mt-0.5 text-caption text-ink-muted">
            {dollars(spend.perMonthCents)}/mo · {dollars(spend.thisQuarterCents)} this quarter
            {delta !== 0 ? (
              <>
                {" · "}
                {arrow} {dollars(Math.abs(delta))} vs {priorLabel.replace(/ \d{4}$/, "")}
              </>
            ) : null}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-2">
          <span className="rounded-pill bg-surface-2 px-2 py-0.5 text-caption text-ink-muted">
            Money
          </span>
          <ArrowRight size={16} className="text-ink-muted" />
        </span>
      </Link>
    </section>
  );
}
