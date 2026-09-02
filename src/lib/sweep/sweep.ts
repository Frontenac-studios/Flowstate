/**
 * W7 — the Sweep. The weekly ritual reads what has gone quiet at three altitudes —
 * tasks untouched, projects with no time logged, targets not moved — and lets each
 * one be dropped, parked, or kept. This lib is the "what has gone stale" half: pure,
 * clock-injected, and DB-free so it can be checked against a hand-built fixture. The
 * router does the reads (each altitude's "last activity" signal differs) and hands
 * this normalized candidates.
 *
 * Two rules the mission cares about live here:
 *  - **Keep buys a month, not a week.** A candidate whose `keptUntil` is still in the
 *    future is excluded outright, so the list visibly shrinks week over week instead
 *    of retraining wholesale dismissal.
 *  - **The list is finite and ends.** At most `cap` items surface — the stalest across
 *    all altitudes — with an honest count of how many more remain, never endless
 *    pagination.
 */

export type SweepAltitude = "task" | "project" | "target";

export type SweepCandidate = {
  altitude: SweepAltitude;
  id: string;
  title: string;
  /** Last touch / last time logged / last movement — the altitude's staleness clock. */
  lastActivityAt: Date;
  /** When a prior "keep" expires; null = never kept. Future value suppresses the item. */
  keptUntil: Date | null;
  /**
   * W10f — this project is a live deal (a promoted prospect with an open lead). A
   * quiet deal is not the same thing as a quiet project: dropping it asks whether it
   * was **lost** (record it, keep the evidence) or should be **deleted** (it was
   * never real). The panel offers that choice only when this is true.
   */
  isDeal?: boolean;
};

export type StaleItem = {
  altitude: SweepAltitude;
  id: string;
  title: string;
  lastActivityAt: Date;
  /** Whole days since last activity, as of `now`. */
  staleDays: number;
  /** A promoted prospect with an open lead — see SweepCandidate.isDeal. */
  isDeal?: boolean;
};

export type SweepDraft = {
  /** The stalest items across all altitudes, stalest-first, capped at `cap`. */
  items: StaleItem[];
  /** Every stale item's altitude count (before the cap), for section headers. */
  countsByAltitude: Record<SweepAltitude, number>;
  /** Total stale items across all altitudes (before the cap). */
  totalStale: number;
  /** totalStale − items.length: how many stale items are not shown. */
  remaining: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export const SWEEP_STALE_DAYS = 21;
export const SWEEP_CAP = 20;
/** Keep buys ~a month of quiet (discovery 1.8), not a week. */
export const SWEEP_KEEP_DAYS = 30;

function wholeDaysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS);
}

export function computeSweep(params: {
  candidates: ReadonlyArray<SweepCandidate>;
  now: Date;
  thresholdDays?: number;
  cap?: number;
}): SweepDraft {
  const thresholdDays = params.thresholdDays ?? SWEEP_STALE_DAYS;
  const cap = params.cap ?? SWEEP_CAP;

  const stale: StaleItem[] = [];
  for (const candidate of params.candidates) {
    // A live "keep" suppresses the item until it expires.
    if (candidate.keptUntil !== null && candidate.keptUntil.getTime() > params.now.getTime()) {
      continue;
    }
    const staleDays = wholeDaysBetween(candidate.lastActivityAt, params.now);
    if (staleDays < thresholdDays) continue;
    stale.push({
      altitude: candidate.altitude,
      id: candidate.id,
      title: candidate.title,
      lastActivityAt: candidate.lastActivityAt,
      staleDays,
      ...(candidate.isDeal ? { isDeal: true } : {}),
    });
  }

  // Stalest first; oldest lastActivityAt breaks ties deterministically by id.
  stale.sort(
    (a, b) =>
      b.staleDays - a.staleDays ||
      a.lastActivityAt.getTime() - b.lastActivityAt.getTime() ||
      a.id.localeCompare(b.id)
  );

  const countsByAltitude: Record<SweepAltitude, number> = { task: 0, project: 0, target: 0 };
  for (const item of stale) countsByAltitude[item.altitude] += 1;

  const items = stale.slice(0, cap);

  return {
    items,
    countsByAltitude,
    totalStale: stale.length,
    remaining: Math.max(0, stale.length - items.length),
  };
}
