"use client";

import { useQuery } from "@tanstack/react-query";

import { DailyWinsTracker } from "@/components/kash/eod/DailyWinsTracker";
import { FocusTimeChart } from "@/components/kash/eod/FocusTimeChart";
import { Top3ReviewSummary } from "@/components/kash/eod/Top3ReviewSummary";
import { useWindDownDue } from "@/hooks/useWindDownDue";
import { useTRPC } from "@/trpc/client";

/**
 * The Today "Review" view: a read-only "how today went" panel reusing the
 * end-of-day pieces (Top-3 outcome + focus time). Writing/saving the full
 * review stays with the end-of-day prompt (EodReviewRunner), so this surface
 * never opens a second modal.
 */
export function TodayReviewPanel({
  localDate,
  tzOffsetMinutes,
}: {
  localDate: string;
  tzOffsetMinutes: number;
}) {
  const trpc = useTRPC();
  const windDownDue = useWindDownDue();
  const { data, isLoading } = useQuery(
    trpc.dayReviews.getPayload.queryOptions({ localDate, tzOffsetMinutes })
  );

  if (isLoading || !data) {
    return (
      <section
        className="rounded-card border border-subtle bg-surface px-5 py-4"
        aria-label="End-of-day review"
      >
        <p className="text-sm text-ink-muted">Loading today’s review…</p>
      </section>
    );
  }

  return (
    <section
      className="flex flex-col gap-5 rounded-card border border-subtle bg-surface px-5 py-4"
      aria-label="End-of-day review"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-caption font-medium uppercase tracking-wide text-ink-muted">
          How today went
        </span>
        <span className="text-caption text-ink-faint">{data.completionsToday} done</span>
      </div>
      <Top3ReviewSummary top3Status={data.top3Status} />
      <FocusTimeChart bars={data.focusBars} overflowCount={data.focusOverflowCount} />
      {windDownDue ? (
        <DailyWinsTracker winDate={localDate} tzOffsetMinutes={tzOffsetMinutes} />
      ) : null}
    </section>
  );
}
