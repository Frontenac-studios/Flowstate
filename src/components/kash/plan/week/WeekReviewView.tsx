"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import WeeklySummaryCard from "@/components/kash/week/WeeklySummaryCard";
import {
  addDays,
  parseISODateString,
  startOfIsoWeekMonday,
  toISODateString,
} from "@/lib/dates/local-day";
import { renderInlineBold } from "@/lib/markdown/inline-bold";
import { formatDuration } from "@/lib/time/duration";
import { useTRPC } from "@/trpc/client";

const DAY_MONTH: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };

/** "Jul 13 – Jul 19" from a Monday ISO week-start date string. */
function formatStoredWeekRange(weekStart: string): string {
  const start = parseISODateString(weekStart);
  const end = addDays(start, 6);
  return `${start.toLocaleDateString(undefined, DAY_MONTH)} – ${end.toLocaleDateString(
    undefined,
    DAY_MONTH
  )}`;
}

/**
 * Full "This Week → review" subview (design #8): the complete weekly breakdown
 * (reused {@link WeeklySummaryCard}) plus a history list of past stored reviews.
 */
export function WeekReviewView() {
  const trpc = useTRPC();
  const { data: history = [] } = useQuery(trpc.weekReviews.list.queryOptions({ limit: 12 }));

  // WeeklySummaryCard already shows the current week live, so drop it from the
  // stored history to avoid a duplicate row.
  const pastReviews = useMemo(() => {
    const currentWeekStart = toISODateString(startOfIsoWeekMonday(new Date()));
    return history.filter((review) => review.weekStart !== currentWeekStart);
  }, [history]);

  return (
    <section className="flex flex-col gap-5">
      <div>
        <Link
          href="/this-week"
          className="rounded-pill border border-border bg-surface px-3 py-1.5 text-sm text-ink-muted transition hover:text-ink focus:outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)]"
        >
          ← This Week
        </Link>
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="text-h1 font-medium text-ink">Week review</h1>
        <p className="text-meta text-ink-faint">Your weekly focus and reflections</p>
      </div>

      <WeeklySummaryCard />

      <section className="flex flex-col gap-3" aria-label="Past reviews">
        <h2 className="text-sm font-medium uppercase tracking-wide text-ink-muted">Past reviews</h2>
        {pastReviews.length === 0 ? (
          <p className="text-sm text-ink-muted">No past reviews yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pastReviews.map((review) => (
              <li
                key={review.weekStart}
                className="rounded-card border border-subtle bg-surface p-4 shadow-surface"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-ink">
                    {formatStoredWeekRange(review.weekStart)}
                  </span>
                  {review.totalSeconds != null && review.totalSeconds > 0 ? (
                    <span className="text-xs text-ink-faint">
                      {formatDuration(review.totalSeconds)} focused
                    </span>
                  ) : null}
                </div>
                {review.summary ? (
                  <p className="mt-2 text-sm text-ink-muted">{renderInlineBold(review.summary)}</p>
                ) : null}
                {review.reflectionText ? (
                  <p className="mt-2 rounded-row border border-subtle bg-surface-2 px-3 py-2 text-sm text-ink">
                    {review.reflectionText}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
