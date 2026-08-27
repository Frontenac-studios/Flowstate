/**
 * Tool-spend read-strip aggregation (W5f, discovery §5). Recurring business spend
 * is a slow margin leak best reviewed at the quarter horizon — so Quarter shows a
 * read-strip (this quarter, a monthly rate, and the change vs last quarter) that
 * drills to Money, which owns the data. Pure so it runs the same over Postgres and
 * the SQLite mirror; the router feeds it pre-fetched expense rows.
 */

import { quarterOf } from "./quarter-period";

export type ExpenseRow = { amountCents: number; incurredOn: Date };

export type ToolSpend = {
  thisQuarterCents: number;
  priorQuarterCents: number;
  /** This quarter's spend spread over three months — the "$/mo" figure. */
  perMonthCents: number;
  /** thisQuarter − priorQuarter; positive means spend crept up. */
  deltaCents: number;
};

function sumInWindow(rows: ReadonlyArray<ExpenseRow>, start: Date, end: Date): number {
  let total = 0;
  for (const r of rows) {
    const t = r.incurredOn.getTime();
    if (t >= start.getTime() && t < end.getTime()) total += r.amountCents;
  }
  return total;
}

/** Spend this quarter, the prior quarter, a monthly rate, and the delta. */
export function computeToolSpend(rows: ReadonlyArray<ExpenseRow>, now: Date): ToolSpend {
  const q = quarterOf(now);
  const prior = quarterOf(new Date(q.start.getTime() - 1));

  const thisQuarterCents = sumInWindow(rows, q.start, q.end);
  const priorQuarterCents = sumInWindow(rows, prior.start, prior.end);

  return {
    thisQuarterCents,
    priorQuarterCents,
    perMonthCents: Math.round(thisQuarterCents / 3),
    deltaCents: thisQuarterCents - priorQuarterCents,
  };
}
